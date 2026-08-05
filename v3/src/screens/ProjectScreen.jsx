import { Bell, CalendarDays, Bike, Wind, Moon, Smile, Meh, Frown, Check, ChevronRight, Flag } from 'lucide-react'
import { projectData } from '../services/projectData'

function daysLeft(eventDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((new Date(`${eventDate}T00:00:00`) - today) / 86400000))
}

function ProjectHero({ project }) {
  const days = daysLeft(project.eventDate)
  return (
    <section className="mission-hero">
      <div className="mission-hero__glow" />
      <div className="mission-hero__top">
        <div className="mission-copy">
          <p>ROAD TO</p>
          <h2><strong>1000</strong><span>KM</span></h2>
          <div className="mission-rule" />
          <div className="mission-days"><strong>{days}</strong><span>DÍAS<br/>RESTANTES</span></div>
        </div>
        <div className="mission-score" style={{ '--score': project.score }}>
          <div className="mission-score__inner">
            <small>ÍNDICE DOCH20</small><strong>{project.score}</strong><b>PREPARADO</b><span>Excelente progreso</span>
          </div>
        </div>
      </div>
      <div className="mission-progress">
        <div className="mission-progress__labels"><span>SEMANA 8 DE 16</span><span>72% DEL CAMINO</span></div>
        <div className="segmented-progress">{Array.from({length:12}).map((_,i)=><i key={i} className={i<8?'complete':''}/>)}</div>
      </div>
    </section>
  )
}

function CoachCard() {
  return (
    <section className="coach-editorial">
      <div className="coach-avatar"><div className="coach-avatar__head"/><div className="coach-avatar__body"/></div>
      <div className="coach-editorial__copy">
        <p className="eyebrow">Coach</p>
        <h3>Excelente semana.</h3>
        <p>Tu recuperación ha sido muy buena. En este momento el cuello de botella son los fondos largos.</p>
        <p className="coach-editorial__action">El objetivo de los próximos 10 días es completar un entrenamiento de 200 km sin buscar velocidad.</p>
      </div>
      <div className="coach-quote">“</div>
    </section>
  )
}

function MilestoneCard({ milestone, navigate }) {
  const pending = Math.max(0, milestone.target - milestone.longest)
  return (
    <section className="milestone-card">
      <p className="eyebrow">Próximo hito</p>
      <div className="milestone-card__flag"><Flag size={92} strokeWidth={1.1}/></div>
      <strong>{milestone.target} km</strong>
      <div className="milestone-date"><CalendarDays size={18}/><span>12 agosto 2026</span></div>
      <p>{pending} km restantes</p>
      <button onClick={()=>navigate('today')}>Preparar salida <ChevronRight size={20}/></button>
    </section>
  )
}

function GoalTimeline({ milestone }) {
  const points=[100,200,300,600,1000]
  return (
    <section className="goal-card">
      <p className="eyebrow">Camino al objetivo</p>
      <div className="goal-list">
        {points.map(point=>{
          const complete=point<=milestone.longest
          const current=point===milestone.target
          return <div className={`goal-item ${complete?'complete':''} ${current?'current':''}`} key={point}>
            <div className="goal-dot">{complete?<Check size={13} strokeWidth={3}/>:null}</div>
            <strong>{point} km</strong>
            <span>{complete?'Completado':current?'Próximo':point===1000?'Objetivo final':''}</span>
          </div>
        })}
      </div>
    </section>
  )
}

const activityIcon = title => title.toLowerCase().includes('viento') ? Wind : title.toLowerCase().includes('descanso') ? Moon : Bike
const moodIcon = mood => mood==='good'?Smile:mood==='neutral'?Meh:mood==='bad'?Frown:null

function Journal({ activities }) {
  return (
    <section className="journal-card">
      <div className="journal-head"><p className="eyebrow">Bitácora</p><button>Ver toda <ChevronRight size={17}/></button></div>
      <div className="journal-list">
        {activities.map(a=>{
          const Icon=activityIcon(a.title), Mood=moodIcon(a.mood)
          return <button className="journal-item" key={a.date+a.title}>
            <time>{a.date}</time><Icon className="activity-type" size={26}/>
            <div className="activity-copy"><strong>{a.title}</strong><span>{a.detail}</span></div>
            <div className="activity-mood">{Mood?<Mood size={25}/>:<span>—</span>}{a.note?<small>{a.note}</small>:null}</div>
            <ChevronRight size={20}/>
          </button>
        })}
      </div>
    </section>
  )
}

export default function ProjectScreen({ navigate }) {
  const { project } = projectData
  return (
    <main className="project-screen">
      <header className="brand-header">
        <div className="brand-logo">DOCH<span>20</span></div>
        <button><Bell size={25}/><i/></button>
      </header>
      <ProjectHero project={project}/>
      <CoachCard/>
      <div className="project-grid">
        <MilestoneCard milestone={project.nextMilestone} navigate={navigate}/>
        <GoalTimeline milestone={project.nextMilestone}/>
      </div>
      <Journal activities={project.activities}/>
    </main>
  )
}
