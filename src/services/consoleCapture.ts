export type LogLevel = 'log' | 'warn' | 'error'

export type LogEntry = {
  level: LogLevel
  message: string
  stack?: string
  timestamp: number
}

const MAX_ENTRIES = 50
const MAX_MESSAGE_LENGTH = 2000

const buffer: LogEntry[] = []

function pushEntry(entry: LogEntry): void {
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.shift()
}

function truncate(value: string): string {
  return value.length > MAX_MESSAGE_LENGTH ? value.slice(0, MAX_MESSAGE_LENGTH) : value
}

// Walks an arbitrary console argument defensively so JSON.stringify can't throw on
// it: DOM nodes and circular references are swapped for placeholders before they
// ever reach JSON.stringify.
function toSerializable(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Node) return `[DOMNode ${value.nodeName}]`
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => toSerializable(item, seen))
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = toSerializable((value as Record<string, unknown>)[key], seen)
  }
  return result
}

function serializeArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`
  try {
    return JSON.stringify(toSerializable(arg, new WeakSet()))
  } catch {
    try {
      return String(arg)
    } catch {
      return '[Unserializable]'
    }
  }
}

function formatMessage(args: unknown[]): string {
  return truncate(args.map(serializeArg).join(' '))
}

let installed = false

// Must run before the app renders: initialisation errors are the most valuable
// ones this buffer can capture. Patched methods always forward to the saved
// originals first, and nothing inside the capture path ever calls a patched
// console method itself, so there's no risk of recursion.
export function installConsoleCapture(): void {
  if (installed) return
  installed = true

  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  const patch = (level: LogLevel) => (...args: unknown[]) => {
    original[level](...args)
    try {
      pushEntry({ level, message: formatMessage(args), timestamp: Date.now() })
    } catch {
      // Capture must never be the reason logging breaks.
    }
  }

  console.log = patch('log')
  console.warn = patch('warn')
  console.error = patch('error')

  window.onerror = (message, source, lineno, colno, error) => {
    pushEntry({
      level: 'error',
      message: truncate(`${String(message)} (${source ?? 'unknown'}:${lineno ?? 0}:${colno ?? 0})`),
      stack: error?.stack,
      timestamp: Date.now(),
    })
  }

  window.onunhandledrejection = (event) => {
    const reason = event.reason
    pushEntry({
      level: 'error',
      message: truncate(reason instanceof Error ? reason.message : serializeArg(reason)),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: Date.now(),
    })
  }
}

export function getLogBuffer(): LogEntry[] {
  return [...buffer]
}
