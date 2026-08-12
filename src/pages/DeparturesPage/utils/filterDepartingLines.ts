import type { DepartingLine } from '../../../types/index'

export const BASE_THRESHOLD_MINUTES = 120
export const MAX_THRESHOLD_MINUTES = 30 * 60
export const THRESHOLD_STEP_MINUTES = 120

export interface FilteredDepartingLines {
  lines: DepartingLine[]
  thresholdMinutes: number
}

function firstDepartureOffset(line: DepartingLine): number {
  return line.departures[0]?.scheduledOffsetMinutes ?? Infinity
}

// Trims each line's departures to those within `threshold` minutes of the reference
// time, dropping lines left with none (e.g. a line whose only near departure was its
// first, with the rest carried over from GTFS extended-notation trips a day away).
function applyThresholdToDepartures(
  lines: DepartingLine[],
  referenceOffsetMinutes: number,
  threshold: number
): DepartingLine[] {
  return lines
    .map((line) => ({
      ...line,
      departures: line.departures.filter(
        (departure) => departure.scheduledOffsetMinutes - referenceOffsetMinutes <= threshold
      ),
    }))
    .filter((line) => line.departures.length > 0)
}

// Filters and orders already-fetched lines by their first departure. Lines further
// than the base threshold from the reference datetime are dropped, progressively
// widening the window (up to `maxThresholdMinutes`) until at least one line
// qualifies, then stopping at that nearest cluster. If nothing qualifies within
// that cap, an empty result is returned unless the cap is the absolute max, in
// which case it gives up and shows everything. When `expandFully` is set (the
// user explicitly asked to see more, rather than this widening silently
// happening), the nearest-cluster short-circuit is skipped and every line within
// `maxThresholdMinutes` is returned instead of just the first non-empty step.
// Once a threshold admits a line, each line's departures are further trimmed to
// that same threshold. Pure client-side pass over data already returned by
// fetchDepartures.
export function filterDepartingLines(
  lines: DepartingLine[],
  referenceOffsetMinutes: number,
  maxThresholdMinutes: number = MAX_THRESHOLD_MINUTES,
  expandFully: boolean = false
): FilteredDepartingLines {
  const sorted = [...lines].sort(
    (a, b) => firstDepartureOffset(a) - firstDepartureOffset(b)
  )

  if (expandFully) {
    const withinThreshold = sorted.filter(
      (line) => firstDepartureOffset(line) - referenceOffsetMinutes <= maxThresholdMinutes
    )
    return {
      lines: applyThresholdToDepartures(withinThreshold, referenceOffsetMinutes, maxThresholdMinutes),
      thresholdMinutes: maxThresholdMinutes,
    }
  }

  for (
    let threshold = BASE_THRESHOLD_MINUTES;
    threshold <= maxThresholdMinutes;
    threshold += THRESHOLD_STEP_MINUTES
  ) {
    const withinThreshold = sorted.filter(
      (line) => firstDepartureOffset(line) - referenceOffsetMinutes <= threshold
    )
    if (withinThreshold.length > 0) {
      return {
        lines: applyThresholdToDepartures(withinThreshold, referenceOffsetMinutes, threshold),
        thresholdMinutes: threshold,
      }
    }
  }

  if (maxThresholdMinutes >= MAX_THRESHOLD_MINUTES) {
    return { lines: sorted, thresholdMinutes: MAX_THRESHOLD_MINUTES }
  }
  return { lines: [], thresholdMinutes: maxThresholdMinutes }
}
