export default function ProjectScore({ project }) {
  return (
    <section className="module score-module">
      <p className="eyebrow">Índice DOCH20</p>

      <div className="score-header">
        <div>
          <strong className="score-value">{project.score}</strong>
          <p className="score-status">{project.scoreStatus}</p>
        </div>
        <div
          className="score-ring"
          style={{ '--score': project.score }}
          aria-label={`Índice DOCH20 ${project.score}`}
        >
          <span />
        </div>
      </div>

      <div className="dimensions-grid">
        {project.dimensions.map(item => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
