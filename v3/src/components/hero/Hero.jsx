import { CalendarDays, ChevronRight } from 'lucide-react'
import HeroBackground from './HeroBackground'
import HeroScore from './HeroScore'

const DAY_MS = 86_400_000

function localDate(value) {
  return new Date(`${value}T00:00:00`)
}

export default function Hero({ project, onOpenPlan }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventDate = localDate(project.eventDate)

  const daysLeft = Math.max(
    0,
    Math.ceil((eventDate - today) / DAY_MS),
  )

  const progress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (project.currentWeek / project.totalWeeks) * 100,
      ),
    ),
  )

  const formattedDate = eventDate.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="premium-hero">
      <HeroBackground />

      <div className="premium-hero__content">
        <div className="premium-hero__top">
          <div>
            <p className="premium-hero__eyebrow">
              Proyecto activo
            </p>

            <h2>
              <span>BREVET</span>
              <strong>1000 KM</strong>
            </h2>

            <div className="premium-hero__date">
              <CalendarDays size={18} strokeWidth={1.7} />
              <span>{formattedDate}</span>
            </div>
          </div>

          <HeroScore score={project.score} />
        </div>

        <div className="premium-hero__countdown">
          <strong>{daysLeft}</strong>

          <span>
            DÍAS
            <br />
            RESTANTES
          </span>
        </div>

        <div className="premium-hero__bottom">
          <div className="premium-hero__progress">
            <div
              className="premium-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <i style={{ width: `${progress}%` }} />
            </div>

            <div className="premium-progress__labels">
              <span>
                Semana {project.currentWeek} de {project.totalWeeks}
              </span>

              <span>{progress}% del camino</span>
            </div>
          </div>

          <div className="premium-hero__footer">
            <div>
              <span>Fase actual</span>
              <strong>{project.phase}</strong>
            </div>

            <button type="button" onClick={onOpenPlan}>
              Ver plan completo
              <ChevronRight size={19} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
