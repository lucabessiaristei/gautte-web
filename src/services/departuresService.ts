import { supabase } from './supabase'
import type { DayOfWeek, DepartingLine, TripDelays } from '../types/index'
import { fetchTripUpdates } from './realtimeService'
import { updateTime, roundTime, parseTimeToSeconds, minutesBetween, REALTIME_WINDOW_MINUTES } from '../utils/timeHelpers'
import { setLastRpcResult } from './feedbackCapture'

const SECONDS_PER_DAY = 86400

// Mirrors the SQL's own sort_time expression: GTFS extended notation (hours >= 24)
// encodes post-midnight trips relative to the previous service day's midnight, so
// once arrival seconds reach a full day past "now" they need to be shifted back
// a day to land on the reference day's timeline.
function computeScheduledOffsetMinutes(arrivalTime: string, nowSeconds: number): number {
    const rawSeconds = parseTimeToSeconds(arrivalTime)
    const alignedSeconds = rawSeconds >= nowSeconds + SECONDS_PER_DAY
        ? rawSeconds - SECONDS_PER_DAY
        : rawSeconds
    return Math.round(alignedSeconds / 60)
}

async function fetchDepartures(stopCode: string, referenceDate: Date = new Date()): Promise<DepartingLine[]> {
    console.time('fetchDepartures:total')

    // --- Resolve stop ---
    console.time('fetchDepartures:stopLookup')
    const { data: stopData, error: stopError } = await supabase
        .from('stops')
        .select('stop_id, stop_name')
        .eq('stop_code', stopCode)
        .single()
    console.timeEnd('fetchDepartures:stopLookup')

    console.log('stopData:', stopData, 'stopError:', stopError)

    if (stopError || !stopData) {
        console.error('Stop not found:', stopError?.message ?? 'no data returned')
        console.timeEnd('fetchDepartures:total')
        return []
    }

    const stopId = stopData.stop_id

    // --- Reference time as seconds since midnight ---
    const nowSeconds = referenceDate.getHours() * 3600 + referenceDate.getMinutes() * 60

    // --- Build date/day strings for calendar filtering ---
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const nowDayOfWeek = daysOfWeek[referenceDate.getDay()] as DayOfWeek
    const nowDate = `${String(referenceDate.getFullYear())}${String((referenceDate.getMonth()) + 1).padStart(2, '0')}${String(referenceDate.getDate()).padStart(2, '0')}`

    const yesterday = new Date(referenceDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDayOfWeek = daysOfWeek[yesterday.getDay()] as DayOfWeek
    const yesterdayDate = `${String(yesterday.getFullYear())}${String((yesterday.getMonth()) + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`

    // --- Fetch static schedule + realtime (only when close to the actual current time) in parallel ---
    const isRealtimeApplicable = minutesBetween(referenceDate, new Date()) <= REALTIME_WINDOW_MINUTES

    console.time('fetchDepartures:fetchTripUpdates')
    const realtimePromise: Promise<TripDelays> = isRealtimeApplicable
        ? fetchTripUpdates()
        : Promise.resolve<TripDelays>(new Map())

    console.time('fetchDepartures:getDeparturesRpc')
    const rpcStartedAt = performance.now()
    const { data: stopTimeData, error: stopTimeError } = await supabase.rpc('get_departures', {
        p_stop_id: stopId,
        p_now_seconds: nowSeconds,
        p_now_date: nowDate,
        p_yesterday_date: yesterdayDate,
        p_day_of_week: nowDayOfWeek,
        p_yesterday_day_of_week: yesterdayDayOfWeek,
        p_max_per_line: 4,
    })
    const rpcDurationMs = performance.now() - rpcStartedAt
    console.timeEnd('fetchDepartures:getDeparturesRpc')

    console.log('departures:', stopTimeData?.length, stopTimeData)

    if (stopTimeError || !stopTimeData) {
        console.error('Stop times not found:', stopTimeError?.message)
        console.timeEnd('fetchDepartures:fetchTripUpdates')
        console.timeEnd('fetchDepartures:total')
        return []
    }

    setLastRpcResult({
        payload: stopTimeData,
        stop: { id: stopId, code: stopCode, name: stopData.stop_name },
        referenceDate,
        timestamp: Date.now(),
        durationMs: rpcDurationMs,
    })

    const tripDelays = await realtimePromise
    console.timeEnd('fetchDepartures:fetchTripUpdates')

    // --- Group by line + headsign, attach realtime delays ---
    const groupedDepartingLines = new Map<string, DepartingLine>()

    stopTimeData.forEach(st => {
        const lineName = st.route_short_name
        const headsign = st.trip_headsign
        const key = `${lineName}-${headsign}`

        if (!groupedDepartingLines.has(key)) {
            groupedDepartingLines.set(key, {
                name: lineName!,
                agency: st.agency_id ?? '',
                headsign: headsign ?? '',
                routeType: st.route_type ?? null,
                departures: []
            })
        }

        const tripDelay = tripDelays.get(st.trip_id)
        const delayEntry = tripDelay?.get(st.stop_sequence!)
        const delayMinValue = delayEntry ? Math.round(delayEntry?.delaySec / 60) : null

        const group = groupedDepartingLines.get(key)!

        group.departures.push({
            scheduledTime: roundTime(st.arrival_time!),
            realtimeTime: delayEntry ? updateTime(st.arrival_time!, delayEntry.delaySec) : null,
            delayMin: delayMinValue !== 0 ? delayMinValue : null,
            tripId: st.trip_id,
            scheduledOffsetMinutes: computeScheduledOffsetMinutes(st.arrival_time!, nowSeconds)
        })
    })

    const result = Array.from(groupedDepartingLines.values())

    console.timeEnd('fetchDepartures:total')

    return result
}

export default fetchDepartures
