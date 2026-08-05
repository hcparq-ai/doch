import { projectData } from '../services/projectData'

import AppHeader from '../components/AppHeader'
import Hero from '../components/hero/Hero'
import ProjectScore from '../components/ProjectScore'
import CoachModule from '../components/CoachModule'
import MilestoneModule from '../components/MilestoneModule'
import GoalTimeline from '../components/GoalTimeline'
import JournalModule from '../components/JournalModule'

export default function ProjectScreen({ navigate }) {
  const { userName, project } = projectData

  return (
    <main className="project-screen">
      <AppHeader userName={userName} />

      <Hero
        project={project}
        onOpenPlan={() => navigate('today')}
      />

      <ProjectScore project={project} />

      <CoachModule
        coach={project.coach}
        onOpen={() => navigate('today')}
      />

      <div className="project-two-column">
        <MilestoneModule
          milestone={project.nextMilestone}
          onPrepare={() => navigate('today')}
        />

        <GoalTimeline
          completedDistance={project.nextMilestone.longest}
          nextMilestone={project.nextMilestone.target}
        />
      </div>

      <JournalModule activities={project.activities} />
    </main>
  )
}