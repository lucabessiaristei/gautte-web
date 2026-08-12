import type { Database } from '../types/supabase'
import type { TripDelays } from '../types'

export type GetDeparturesRow = Database['public']['Functions']['get_departures']['Returns'][number]

export type StopContext = {
  id: string
  code: string
  name: string | null
}

export type RpcCapture = {
  payload: GetDeparturesRow[]
  stop: StopContext
  referenceDate: Date
  timestamp: number
  durationMs: number
}

export type RtCapture = {
  payload: TripDelays
  durationMs: number
}

export type FeedbackContext = {
  rpc: RpcCapture | null
  rt: RtCapture | null
  activeThresholdMinutes: number | null
}

let lastRpc: RpcCapture | null = null
let lastRt: RtCapture | null = null
let activeThresholdMinutes: number | null = null

export function setLastRpcResult(capture: RpcCapture): void {
  lastRpc = capture
  // A new search's RT fetch may be skipped entirely (out-of-window reference date),
  // in which case the previous search's RT snapshot must not be attributed to it.
  lastRt = null
}

export function setLastRtResult(capture: RtCapture): void {
  lastRt = capture
}

export function setActiveThreshold(minutes: number | null): void {
  activeThresholdMinutes = minutes
}

export function getFeedbackContext(): FeedbackContext {
  return { rpc: lastRpc, rt: lastRt, activeThresholdMinutes }
}

export function tripDelaysToPlainObject(delays: TripDelays): Record<string, Record<number, number>> {
  const result: Record<string, Record<number, number>> = {}
  delays.forEach((stopDelays, tripId) => {
    const perStop: Record<number, number> = {}
    stopDelays.forEach((entry, stopSequence) => {
      perStop[stopSequence] = entry.delaySec
    })
    result[tripId] = perStop
  })
  return result
}
