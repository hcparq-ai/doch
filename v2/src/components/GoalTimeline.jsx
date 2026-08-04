import { Check } from 'lucide-react'

const milestones = [100, 200, 300, 600, 1000]

export default function GoalTimeline({
  completedDistance = 119,
  nextMilestone = 200,
}) {
  return (
    <section className="module goal-timeline">
      <p className="eyebrow">Camino al objetivo</p>

      <div className="goal-timeline__list">
        {milestones.map((distance) => {
          const completed = distance <= completedDistance
          const current = distance === nextMilestone

          return (
            <div
              className={`goal-timeline__item ${
                completed ? 'completed' : ''
              } ${current ? 'current' : ''}`}
              key={distance}
            >
              <div className="goal-timeline__marker">
                {completed ? <Check size={14} strokeWidth={3} /> : null}
              </div>

              <strong>{distance} km</strong>

              <span>
                {completed
                  ? 'Completado'
                  : current
                    ? 'Próximo'
                    : distance === 1000
                      ? 'Objetivo final'
                      : ''}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}