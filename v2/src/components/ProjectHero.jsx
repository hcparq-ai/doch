import { CalendarDays, ChevronRight, Flag } from 'lucide-react'

const DAY_MS = 86_400_000

function parseLocalDate(value) {
  return new Date(`${value}T00:00:00`)
}

function calculateDaysLeft(eventDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = parseLocalDate(eventDate)
  return Math.max(0, Math.ceil((target - today) / DAY_MS))
}

function calculateProgress(currentWeek, totalWeeks) {
  if (!totalWeeks || totalWeeks <= 0) return 0

  return Math.min(
    100,
    Math.max(0, Math.round((currentWeek / totalWeeks) * 100)),
  )
}

export default function ProjectHero({
  project,
  onOpenPlan = () => {},
}) {
  const daysLeft = calculateDaysLeft(project.eventDate)
  const progress = calculateProgress(
    project.currentWeek,
    project.totalWeeks,
  )

  const formattedDate = parseLocalDate(
    project.eventDate,
  ).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="project-hero">
      <div className="project-hero__background" aria-hidden="true">
  <div className="project-hero__mountain" />

  <svg
    className="project-hero__route"
    viewBox="0 0 360 260"
    fill="none"
    preserveAspectRatio="xMidYMid meet"
  >
    <path
      d="M22 248
         C74 232 88 205 120 187
         C151 169 193 176 211 145
         C229 114 212 91 245 72
         C277 53 301 44 326 15"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <circle cx="120" cy="187" r="5" fill="currentColor" />
    <circle cx="245" cy="72" r="5" fill="currentColor" />
  </svg>

  <Flag
    className="project-hero__flag"
    size={24}
    strokeWidth={2}
  />
</div>
      <div className="project-hero__content">
        <p className="eyebrow">Proyecto activo</p>

        <h2>{project.title}</h2>

        <div className="project-hero__date">
          <CalendarDays size={18} strokeWidth={1.7} />
          <span>{formattedDate}</span>
        </div>

        <div className="project-hero__countdown">
          <strong>{daysLeft}</strong>

          <span>
            días
            <br />
            restantes
          </span>
        </div>

        <div className="project-hero__progress">
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Avance temporal del proyecto"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <i style={{ width: `${progress}%` }} />
          </div>

          <div className="progress-meta">
            <span>
              Semana {project.currentWeek} de {project.totalWeeks}
            </span>

            <span>{progress}% del camino</span>
          </div>
        </div>

        <div className="project-hero__footer">
          <div>
            <span>Fase actual</span>
            <strong>{project.phase}</strong>
          </div>

          <button
            type="button"
            className="project-hero__plan-button"
            onClick={onOpenPlan}
          >
            Ver plan completo
            <ChevronRight size={19} strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}