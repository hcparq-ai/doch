import { useEffect, useState } from 'react'
import { loadProjectData } from '../services/projectData'
import ProjectHero from '../components/ProjectHero'
import ProjectScore from '../components/ProjectScore'
import CoachModule from '../components/CoachModule'
import MilestoneModule from '../components/MilestoneModule'
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
      <header className="top-header">
        <div className="brand">DOCH<span>20</span></div>
        <div className="intro">
          <span>Buenos días, {data.userName}.</span>
          <h1>Así va tu proyecto.</h1>
        </div>
      </header>

      <ProjectHero project={data.project} />
      <ProjectScore project={data.project} />
      <CoachModule coach={data.project.coach} />
      <MilestoneModule milestone={data.project.nextMilestone} />
      <JournalModule activities={data.project.activities} />
    </main>
  )
}
