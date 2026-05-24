export type Departure = {
  scheduledTime: string
  realtimeTime: string | null
  delayMin: number | null
  tripId: string
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