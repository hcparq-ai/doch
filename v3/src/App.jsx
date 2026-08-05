import { useState } from 'react'
import { Home, CalendarDays, Bike, ChartNoAxesCombined, Settings } from 'lucide-react'
import ProjectScreen from './screens/ProjectScreen'

const tabs = [
  { id: 'project', label: 'Inicio', icon: Home },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'today', label: 'Hoy', icon: Bike, featured: true },
  { id: 'progress', label: 'Progreso', icon: ChartNoAxesCombined },
  { id: 'equipment', label: 'Equipo', icon: Settings },
]

export default function App() {
  const [active, setActive] = useState('project')
  return (
    <div className="app-shell">
      <div className="app-content">
        {active === 'project' ? (
          <ProjectScreen navigate={setActive} />
        ) : (
          <main className="placeholder-screen">
            <p className="eyebrow">{tabs.find(t => t.id === active)?.label}</p>
            <h1>En construcción</h1>
          </main>
        )}
      </div>
      <nav className="bottom-nav">
        {tabs.map(({ id, label, icon: Icon, featured }) => (
          <button key={id} className={`${active === id ? 'active' : ''} ${featured ? 'featured' : ''}`} onClick={() => setActive(id)}>
            <span className="nav-icon"><Icon size={featured ? 26 : 23} /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
