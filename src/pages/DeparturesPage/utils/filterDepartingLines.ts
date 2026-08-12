import type { DepartingLine } from '../../types/index'

export const BASE_THRESHOLD_MINUTES = 120
const MAX_THRESHOLD_MINUTES = 30 * 60
const THRESHOLD_STEP_MINUTES = 120

export interface FilteredDepartingLines {
  lines: DepartingLine[]
  thresholdMinutes: number
}

function firstDepartureOffset(line: DepartingLine): number {
  return line.departures[0]?.scheduledOffsetMinutes ?? Infinity
}

// Filters and orders already-fetched lines by their first departure. Lines further
// than the base threshold from the reference datetime are dropped, progressively
// widening the window until at least one line qualifies (or giving up and showing
// everything). Pure client-side pass over data already returned by fetchDepartures.
export function filterDepartingLines(
  lines: DepartingLine[],
  referenceOffsetMinutes: number
): FilteredDepartingLines {
  const sorted = [...lines].sort(
    (a, b) => firstDepartureOffset(a) - firstDepartureOffset(b)
  )

  for (
    let threshold = BASE_THRESHOLD_MINUTES;
    threshold <= MAX_THRESHOLD_MINUTES;
    threshold += THRESHOLD_STEP_MINUTES
  ) {
    const withinThreshold = sorted.filter(
      (line) => firstDepartureOffset(line) - referenceOffsetMinutes <= threshold
    )
    if (withinThreshold.length > 0) {
      return { lines: withinThreshold, thresholdMinutes: threshold }
    }
  }

  return { lines: sorted, thresholdMinutes: MAX_THRESHOLD_MINUTES }
}
