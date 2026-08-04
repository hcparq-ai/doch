export default function MilestoneModule({ milestone }) {
  const percent = Math.min(100, Math.round((milestone.longest / milestone.target) * 100))
  const pending = Math.max(0, milestone.target - milestone.longest)

  return (
    <section className="module milestone-module">
      <p className="eyebrow">Próximo hito</p>
      <div className="milestone-header">
        <div>
          <strong>{milestone.target} km</strong>
          <span>Mayor salida: {milestone.longest} km</span>
        </div>
        <div className="pending">
          {pending}
          <small>km pendientes</small>
        </div>
      </div>

      <div className="progress-track">
        <i style={{ width: `${percent}%` }} />
      </div>

      <button className="primary-button">Preparar salida <span>→</span></button>
    </section>
  )
}
