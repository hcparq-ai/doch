import MilestoneModule from './MilestoneModule'
import GoalTimeline from './GoalTimeline'

export default function MilestonesGrid({ milestone }) {
  return (
    <div className="milestones-grid">
      <MilestoneModule milestone={milestone} />

      <GoalTimeline
        completedDistance={milestone.longest}
        nextMilestone={milestone.target}
      />
    </div>
  )
}