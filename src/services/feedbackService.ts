import { toJpeg } from 'html-to-image'
import { supabase } from './supabase'
import { getFeedbackContext, tripDelaysToPlainObject } from './feedbackCapture'
import { getLogBuffer } from './consoleCapture'
import { formatDateToUrl } from '../utils/timeHelpers'
import type { Json } from '../types/supabase'

export type SubmitFeedbackResult = { ok: true } | { ok: false; error: string }

type ScreenshotResult = {
  path: string | null
  error: string | null
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

// Best-effort only: any failure here still lets the report go through with
// screenshot_path null and the reason recorded in app_state.screenshot_error.
async function captureScreenshot(): Promise<ScreenshotResult> {
  const root = document.getElementById('root')
  if (!root) return { path: null, error: 'root element not found' }

  let dataUrl: string
  try {
    dataUrl = await toJpeg(root, { quality: 0.7 })
  } catch (error) {
    return { path: null, error: errorMessage(error, 'screenshot capture failed') }
  }

  let blob: Blob
  try {
    blob = await (await fetch(dataUrl)).blob()
  } catch (error) {
    return { path: null, error: errorMessage(error, 'screenshot conversion failed') }
  }

  const path = `${new Date().toISOString()}-${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await supabase.storage.from('feedback').upload(path, blob, {
    contentType: 'image/jpeg',
  })

  if (uploadError) {
    return { path: null, error: uploadError.message }
  }

  return { path, error: null }
}

function buildAppState(screenshotError: string | null): Json {
  const context = getFeedbackContext()
  const rpc = context.rpc

  const selected = rpc ? formatDateToUrl(rpc.referenceDate) : null

  const appState = {
    stop: rpc ? { id: rpc.stop.id, code: rpc.stop.code, name: rpc.stop.name } : null,
    filters: {
      selectedDate: selected?.dateStr ?? null,
      selectedTime: selected ? `${selected.hourStr}:${selected.minuteStr}` : null,
      activeThreshold: context.activeThresholdMinutes,
    },
    routing: {
      pathname: window.location.pathname,
      href: window.location.href,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      orientation: screen.orientation?.type ?? null,
    },
    client: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      effectiveType: navigator.connection?.effectiveType ?? null,
    },
    timing: {
      capturedAt: Date.now(),
      rpcTimestamp: rpc?.timestamp ?? null,
      rpcDurationMs: rpc?.durationMs ?? null,
      rtDurationMs: context.rt?.durationMs ?? null,
    },
    scrollY: window.scrollY,
    build: __GIT_SHA__,
    logs: getLogBuffer(),
    screenshot_error: screenshotError,
  }

  return appState as unknown as Json
}

export async function submitFeedback(note: string): Promise<SubmitFeedbackResult> {
  const { path: screenshotPath, error: screenshotError } = await captureScreenshot()

  const context = getFeedbackContext()
  const trimmedNote = note.trim()

  const { error } = await supabase.from('feedback').insert({
    note: trimmedNote ? trimmedNote : null,
    app_state: buildAppState(screenshotError),
    rpc_payload: context.rpc ? (context.rpc.payload as unknown as Json) : null,
    rt_payload: context.rt ? (tripDelaysToPlainObject(context.rt.payload) as unknown as Json) : null,
    screenshot_path: screenshotPath,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
