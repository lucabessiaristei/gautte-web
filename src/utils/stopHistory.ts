export interface RecentStop {
  value: string
  label: string
}

const STORAGE_KEY = 'gautte:recentStops'
const MAX_RECENT_STOPS = 5

export function getRecentStops(): RecentStop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRecentStop(stop: RecentStop): RecentStop[] {
  const updated = [stop, ...getRecentStops().filter((s) => s.value !== stop.value)].slice(0, MAX_RECENT_STOPS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable (e.g. private browsing) - history just won't persist
  }
  return updated
}
