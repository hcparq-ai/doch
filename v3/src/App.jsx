import { useState } from 'react'
import { Home, CalendarDays, ChartNoAxesCombined, Heart, Settings } from 'lucide-react'
import ProjectScreen from './screens/ProjectScreen'
const tabs=[['project','Proyecto',Home],['today','Hoy',CalendarDays],['progress','Progreso',ChartNoAxesCombined],['state','Estado',Heart],['equipment','Equipo',Settings]]
export default function App(){const[active,setActive]=useState('project');return <div className="app-shell"><div className="app-content">{active==='project'?<ProjectScreen navigate={setActive}/>:<main className="placeholder-screen"><p className="eyebrow">{tabs.find(t=>t[0]===active)?.[1]}</p><h1>En construcción</h1></main>}</div><nav className="bottom-nav">{tabs.map(([id,label,Icon])=><button key={id} className={active===id?'active':''} onClick={()=>setActive(id)}><Icon size={22}/><span>{label}</span></button>)}</nav></div>}
