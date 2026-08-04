import { useEffect, useState } from 'react'
import { loadProjectData } from '../services/projectData'

import AppHeader from '../components/AppHeader'
import ProjectHero from '../components/ProjectHero'
import ProjectScore from '../components/ProjectScore'
import CoachModule from '../components/CoachModule'
import MilestonesGrid from '../components/MilestonesGrid'
import JournalModule from '../components/JournalModule'

export default function ProjectScreen() {
  const [data, setData] = useState(null)

  useEffect(() => {
    loadProjectData().then(setData)
  }, [])

  if (!data) {
    return <main className="loading-screen">Cargando proyecto…</main>
  }

  return (
    <main className="project-screen">
      <AppHeader userName={data.userName} />

      <ProjectHero
        project={data.project}
        onOpenPlan={() => console.log('Abrir plan completo')}
      />

      <ProjectScore project={data.project} />

      <CoachModule coach={data.project.coach} />

      <MilestonesGrid milestone={data.project.nextMilestone} />

      <JournalModule activities={data.project.activities} />
    </main>
  )
}