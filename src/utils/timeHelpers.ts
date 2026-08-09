// How far (in minutes, either direction) the reference datetime may be from the
// actual current time before realtime data is considered inapplicable.
export const REALTIME_WINDOW_MINUTES = 120

// How far (in minutes) the datetime selector's value must drift from "now"
// before the reset control is shown, so it doesn't appear from mere clock drift.
export const RESET_TOLERANCE_MINUTES = 5

export function parseTimeToSeconds(timeStr: string): number {
  const [h, m, s] = timeStr.split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000
}

export function roundTime(timeStr: string): string {
  const [h, m, s] = timeStr.split(':').map(Number)
  const totalMinutes = h * 60 + m + Math.round(s / 60)
  const roundedH = Math.floor(totalMinutes / 60) % 24
  const roundedM = totalMinutes % 60
  return `${String(roundedH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`
}

export function updateTime(timeStr: string, offsetSeconds: number): string {
  const [h, m, s] = timeStr.split(':').map(Number)
  const totalSeconds = h * 3600 + m * 60 + s + offsetSeconds
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getCurrentDate() {
  const now = new Date()
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}
