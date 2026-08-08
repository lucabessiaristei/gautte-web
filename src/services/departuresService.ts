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
    const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60
    const lookaheadSeconds = limitHours * 3600

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

    const { data: stopTimeData, error: stopTimeError } = await supabase.rpc('get_departures', {
        p_stop_id: stopId,
        p_now_seconds: nowSeconds,
        p_lookahead_seconds: lookaheadSeconds,
        p_now_date: nowDate,
        p_yesterday_date: yesterdayDate,
        p_day_of_week: nowDayOfWeek,
        p_yesterday_day_of_week: yesterdayDayOfWeek,
        p_max_per_line: 4,
    })

    if (stopTimeError || !stopTimeData) {
        console.error('Stop times not found:', stopTimeError?.message)
        return []
    }

    const tripDelays = await realtimePromise

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
            tripId: st.trip_id
        })
    })

    return Array.from(groupedDepartingLines.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    )

}

export default fetchDepartures
