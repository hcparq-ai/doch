export default function JournalModule({ activities }) {
  return (
    <section className="module journal-module">
      <div className="section-heading">
        <p className="eyebrow">Bitácora reciente</p>
        <button>Ver toda</button>
      </div>

      <div className="activity-list">
        {activities.map(activity => (
          <button className="activity-row" key={`${activity.date}-${activity.title}`}>
            <time>{activity.date}</time>
            <div>
              <strong>{activity.title}</strong>
              <span>{activity.detail}</span>
            </div>
            <span>→</span>
          </button>
        ))}
      </div>
    </section>
  )
}
