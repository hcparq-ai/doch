import { Eye, TriangleAlert, Target, ChevronRight } from 'lucide-react'

const items = [
  {
    key: 'observation',
    label: 'Observación',
    icon: Eye,
  },
  {
    key: 'risk',
    label: 'Riesgo',
    icon: TriangleAlert,
  },
  {
    key: 'action',
    label: 'Acción',
    icon: Target,
  },
]

export default function CoachModule({ coach }) {
  return (
    <section className="module coach-panel">
      <div className="coach-panel__header">
        <p className="eyebrow">Coach DOCH20</p>
      </div>

      <div className="coach-panel__grid">
        {items.map(({ key, label, icon: Icon }) => (
          <article className="coach-panel__item" key={key}>
            <div className="coach-panel__title">
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
            </div>

            <p>{coach[key]}</p>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="coach-panel__button"
        onClick={() => console.log('Abrir recomendaciones')}
      >
        Ver recomendaciones completas
        <ChevronRight size={18} />
      </button>
    </section>
  )
}