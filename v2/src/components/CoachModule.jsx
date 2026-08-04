export default function CoachModule({ coach }) {
  const rows = [
    ['Observación', coach.observation],
    ['Riesgo', coach.risk],
    ['Acción', coach.action],
  ]

  return (
    <section className="module coach-module">
      <p className="eyebrow">Coach</p>
      {rows.map(([label, value]) => (
        <div className={`coach-row ${label === 'Acción' ? 'action' : ''}`} key={label}>
          <span>{label}</span>
          <p>{value}</p>
        </div>
      ))}
      <button className="secondary-button">Abrir análisis <span>→</span></button>
    </section>
  )
}
