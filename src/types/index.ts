export type Departure = {
  scheduledTime: string
  realtimeTime: string | null
  delayMin: number | null
  tripId: string
  // Minutes from the query's reference datetime's midnight to this departure,
  // already adjusted for GTFS extended-notation (hours >= 24) post-midnight
  // trips carried over from the previous service day. Always >= 0.
  scheduledOffsetMinutes: number
}

export type DepartingLine = {
  name: string
  agency: string
  headsign: string
  routeType: number | null
  departures: Departure[]
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type DelayEntry = {
  delaySec: number
}

export type TripDelays = Map<string, Map<number, DelayEntry>>

export type StopSearchResult = {
  stopCode: string
  stopName: string
  readableName: string
}