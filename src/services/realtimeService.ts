import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import type { TripDelays, DelayEntry } from '../types'

function toSignedInt32(big: bigint): number {
    return Number(BigInt.asIntN(32, big))
}

export async function fetchTripUpdates(): Promise<TripDelays> {
    const tripDelays: TripDelays = new Map()

    try {

        const response = await fetch('/api/realtime')
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)


        const buffer = await response.arrayBuffer()
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        )

        for (const entity of feed.entity) {
            if (!entity.tripUpdate) continue

            const tripId = entity.tripUpdate.trip?.tripId
            if (!tripId) continue

            const stopDelays = new Map<number, DelayEntry>()

            for (const stu of entity.tripUpdate.stopTimeUpdate ?? []) {
                const seq = stu.stopSequence
                if (seq === undefined || seq === null) continue

                const delaySec = stu.arrival?.delay ?? stu.departure?.delay ?? 0
                stopDelays.set(seq, { delaySec: toSignedInt32(BigInt(delaySec)) })
            }

            tripDelays.set(tripId, stopDelays)
        }

    } catch (error) {
        console.error('Realtime fetch failed:', error)
    }
        console.log('tripDelays size:', tripDelays.size)

    return tripDelays
}
