import { supabase } from './supabase'
import type { StopSearchResult } from '../types/index'


export async function searchStops(query: string): Promise<StopSearchResult[]> {

    const { data: stopData, error: stopError } = await supabase
        .rpc('search_stops', { search_query: query })

    if (stopError || !stopData) {
        console.error('Stop not found:', stopError?.message ?? 'no data returned')
        return []
    }

    const results = stopData.map(stop =>
    ({
        stopCode: stop.stop_code!,
        stopName: stop.stop_name!,
        readableName: stop.stop_name!.replace(/^Fermata \S+ - /, '')
    })
    )

    return results
}