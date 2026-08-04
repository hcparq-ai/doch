import { Bell } from 'lucide-react'

export default function AppHeader({ userName = 'Héctor' }) {
  return (
    <header className="app-header">
      <div className="app-header__top">
        <div>
          <div className="app-header__brand">
            DOCH<span>20</span>
          </div>

          <p className="app-header__tagline">
            Built for the long ride
          </p>
        </div>

        <button
          type="button"
          className="app-header__notification"
          aria-label="Abrir notificaciones"
          onClick={() => console.log('Abrir notificaciones')}
        >
          <Bell size={24} strokeWidth={1.7} />
          <i />
        </button>
      </div>

      <div className="app-header__intro">
        <span>Buenos días, {userName}.</span>
        <h1>Así va tu proyecto.</h1>
      </div>
    </header>
  )
}