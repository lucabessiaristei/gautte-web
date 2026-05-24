import TramIcon from '../assets/tram-mini.svg?react'
import MetroIcon from '../assets/metro-mini.svg?react'
import BusIcon from '../assets/bus-mini.svg?react'
import RackIcon from '../assets/rack-mini.svg?react'

<TramIcon className="w-4 h-4" />

export function getTransportIcon(routeType: number | null) {
    switch (routeType) {
        case 0:
            return <TramIcon className="h-4 w-auto" stroke="currentColor" strokeWidth={3}/>;
        case 1:
            return <MetroIcon className="h-4 w-auto" stroke="currentColor" strokeWidth={3}/>;
        case 3:
            return <BusIcon className="h-4 w-auto" stroke="currentColor" strokeWidth={3.5} />;
        case 7:
            return <RackIcon className="h-4 w-auto" stroke="currentColor" strokeWidth={3}/>;
    }
}