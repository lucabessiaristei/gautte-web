import { supabase } from './supabase'
import type { DayOfWeek, DepartingLine } from '../types/index'
import { fetchTripUpdates } from './realtimeService'
import { updateTime, roundTime } from '../utils/timeHelpers'


async function fetchDepartures(stopCode: string): Promise<DepartingLine[]> {

    // --- Resolve stop ---
    const { data: stopData, error: stopError } = await supabase
        .from('stops')
        .select('stop_id, stop_name')
        .eq('stop_code', stopCode)
        .single()

    console.log('stopData:', stopData, 'stopError:', stopError)

    if (stopError || !stopData) {
        console.error('Stop not found:', stopError?.message ?? 'no data returned')
        return []
    }

    const stopId = stopData.stop_id

    // --- Build time window ---
    const now = new Date()
    // Late night (00:00–03:59): widen lookahead to 4h to avoid empty boards
    const isLateNight = now.getHours() < 4

    const limitHours = isLateNight ? 4 : 2
    const limit = new Date(Date.now() + limitHours * 60 * 60 * 1000)

    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    const limitTime = `${String(limit.getHours()).padStart(2, '0')}:${String(limit.getMinutes()).padStart(2, '0')}:00`
    // GTFS encodes post-midnight trips with hours ≥ 24 relative to the previous service day
    const extendedNowTime = `${String(now.getHours() + 24).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    const extendedLimitTime = `${String(limit.getHours() + 24).padStart(2, '0')}:${String(limit.getMinutes()).padStart(2, '0')}:00`

    // --- Build date/day strings for calendar filtering ---
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const nowDayOfWeek = daysOfWeek[now.getDay()] as DayOfWeek
    const nowDate = `${String(now.getFullYear())}${String((now.getMonth()) + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDayOfWeek = daysOfWeek[yesterday.getDay()] as DayOfWeek
    const yesterdayDate = `${String(yesterday.getFullYear())}${String((yesterday.getMonth()) + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`

    // --- Fetch static schedule + realtime in parallel ---
    const realtimePromise = fetchTripUpdates()

    const selectString = `
        arrival_time,
        stop_sequence,
        trips (
            trip_id,
            trip_headsign,
            service_id,
            routes ( route_short_name, agency_id, route_type ),
            calendar!trips_service_id_fkey ( monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date )
        )
    `

    let stopTimeData: any[] = []

    if (isLateNight) {
        // Query both normal and extended (≥24h) ranges so post-midnight trips aren't missed
        const [normalResult, extendedResult] = await Promise.all([
            supabase.from('stop_times').select(selectString)
                .eq('stop_id', stopId)
                .gte('arrival_time', nowTime)
                .lte('arrival_time', limitTime)
                .order('arrival_time').limit(30),
            supabase.from('stop_times').select(selectString)
                .eq('stop_id', stopId)
                .gte('arrival_time', extendedNowTime)
                .lte('arrival_time', extendedLimitTime)
                .order('arrival_time').limit(30)
        ])
        if (normalResult.error) console.error('Stop times (normal) not found:', normalResult.error.message)
        if (extendedResult.error) console.error('Stop times (extended) not found:', extendedResult.error.message)
        if (!normalResult.data && !extendedResult.data) return []
        stopTimeData = [...(normalResult.data ?? []), ...(extendedResult.data ?? [])]
    } else {
        const { data, error: stopTimeError } = await supabase.from('stop_times').select(selectString)
            .eq('stop_id', stopId)
            .gte('arrival_time', nowTime)
            .lte('arrival_time', limitTime)
            .order('arrival_time').limit(30)
        if (stopTimeError || !data) {
            console.error('Stop times not found:', stopTimeError?.message)
            return []
        }
        stopTimeData = data
    }

    const tripDelays = await realtimePromise

    // --- Filter by active calendar ---
    // Extended trips (h ≥ 24) belong to yesterday's service day
    const activeStopTimes = stopTimeData.filter(st => {
        if (!st.arrival_time || !st.trips?.routes?.route_short_name || !st.trips?.calendar) return false

        const h = parseInt(st.arrival_time.split(':')[0])
        const isExtended = h >= 24
        const relevantDate = isExtended ? yesterdayDate : nowDate
        const relevantDayOfWeek = isExtended ? yesterdayDayOfWeek : nowDayOfWeek

        return (
            (relevantDate >= st.trips.calendar.start_date!) &&
            (relevantDate <= st.trips.calendar.end_date!) &&
            (st.trips.calendar as any)[relevantDayOfWeek] === '1'
        )
    })

    // --- Group by line + headsign, attach realtime delays ---
    const groupedDepartingLines = new Map<string, DepartingLine>()

    activeStopTimes.forEach(st => {
        if (!st.trips?.routes) return
        const lineName = st.trips.routes.route_short_name
        const headsign = st.trips.trip_headsign
        const key = `${lineName}-${headsign}`

        if (!groupedDepartingLines.has(key)) {
            groupedDepartingLines.set(key, {
                name: lineName!,
                agency: st.trips.routes.agency_id ?? '',
                headsign: headsign ?? '',
                routeType: st.trips.routes.route_type ?? null,
                departures: []
            })
        }

        const tripDelay = tripDelays.get(st.trips.trip_id)
        const delayEntry = tripDelay?.get(st.stop_sequence!)
        const delayMinValue = delayEntry ? Math.round(delayEntry?.delaySec / 60) : null

        const group = groupedDepartingLines.get(key)!

        if (group.departures.length >= 4) return

        group.departures.push({
            scheduledTime: roundTime(st.arrival_time!),
            realtimeTime: delayEntry ? updateTime(st.arrival_time!, delayEntry.delaySec) : null,
            delayMin: delayMinValue !== 0 ? delayMinValue : null,
            tripId: st.trips.trip_id
        })
    })

    return Array.from(groupedDepartingLines.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    )

}

export default fetchDepartures
