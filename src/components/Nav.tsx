import { Link } from 'react-router-dom'

function Nav() {
  return (
    <nav>
      <Link to="/">Map</Link>
      <Link to="/departures">Departures</Link>
      <Link to="/about">About</Link>
    </nav>
  )
}

export default Nav