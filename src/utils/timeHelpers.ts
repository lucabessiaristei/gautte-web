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
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}
