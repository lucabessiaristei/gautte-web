import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Mappa' },
  { to: '/departures', label: 'Partenze' },
  { to: '/about', label: 'Info' },
]

function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-2 bg-background border-b border-border z-50">
      <span className="text-caption font-bold tracking-widest uppercase text-primary">GAUTTE</span>
      <div className="flex items-center gap-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              'px-4 py-1 rounded-md text-caption font-medium transition-all border ' +
              (isActive
                ? 'bg-accent text-background border-transparent'
                : 'bg-surface text-muted border-transparent hover:text-foreground hover:border-border')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Nav
