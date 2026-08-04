export default function ProjectHero({ project }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(project.eventDate) - new Date()) / 86400000)
  )
  const progress = Math.round((project.currentWeek / project.totalWeeks) * 100)

  return (
    <section className="module project-hero">
      <p className="eyebrow">Proyecto activo</p>
      <h2>{project.title}</h2>
      <p className="event-date">
        {new Date(project.eventDate).toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <div className="countdown">
        <strong>{daysLeft}</strong>
        <span>días<br />restantes</span>
      </div>

      <div className="progress-track" aria-label={`${progress}% del proyecto`}>
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-meta">
        <span>Semana {project.currentWeek} de {project.totalWeeks}</span>
        <span>{progress}% del proyecto</span>
      </div>

      <div className="phase-row">
        <span>Fase actual</span>
        <strong>{project.phase}</strong>
      </div>
    </section>
  )
}
