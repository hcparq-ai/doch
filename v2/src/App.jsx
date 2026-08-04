import { useState } from 'react'
import { Home, CalendarDays, ChartNoAxesCombined, Heart, Bike } from 'lucide-react'
import ProjectScreen from './screens/ProjectScreen'

const tabs = [
  { id: 'project', label: 'Proyecto', icon: Home },
  { id: 'today', label: 'Hoy', icon: CalendarDays },
  { id: 'progress', label: 'Progreso', icon: ChartNoAxesCombined },
  { id: 'state', label: 'Estado', icon: Heart },
  { id: 'equipment', label: 'Equipo', icon: Bike },
]

export default function App() {
  const [active, setActive] = useState('project')

  return (
    <div className="app-shell">
      <div className="app-content">
        {active === 'project'
          ? <ProjectScreen />
          : <PlaceholderScreen title={tabs.find(tab => tab.id === active)?.label} />}
      </div>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={active === id ? 'active' : ''}
            onClick={() => setActive(id)}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function PlaceholderScreen({ title }) {
  return (
    <main className="placeholder-screen">
      <p className="eyebrow">{title}</p>
      <h1>En construcción</h1>
      <p>Esta pantalla se implementará después de cerrar Proyecto.</p>
    </main>
  )
}
