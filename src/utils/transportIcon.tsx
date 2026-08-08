import TramIcon from '../assets/tram-mini.svg?react'
import MetroIcon from '../assets/metro-mini.svg?react'
import BusIcon from '../assets/bus-mini.svg?react'
import RackIcon from '../assets/rack-mini.svg?react'

const iconStyle = { height: '1rem', width: 'auto' }

export function getTransportIcon(routeType: number | null) {
  switch (routeType) {
    case 0:
      return <TramIcon style={iconStyle} stroke="currentColor" strokeWidth={3} />
    case 1:
      return <MetroIcon style={iconStyle} stroke="currentColor" strokeWidth={3} />
    case 3:
      return <BusIcon style={iconStyle} stroke="currentColor" strokeWidth={3} />
    case 7:
      return <RackIcon style={iconStyle} stroke="currentColor" strokeWidth={3} />
    default:
      return null
  }
}
