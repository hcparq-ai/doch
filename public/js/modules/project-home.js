
const DOCH20_PROJECT = {
 title:'Brevet 1000 km',
 eventDate:'2026-10-09',
 startDate:'2026-06-19',
 phase:'Construcción',
 targetDistance:1000
};

function safeLocalDate(value){
 if(typeof parseLocalDate==='function') return parseLocalDate(value);
 return new Date(String(value).length===10?`${value}T00:00:00`:value);
}
function projectWorkouts(){
 const raw=(window.state&&Array.isArray(state.workouts))?state.workouts:[];
 return typeof normalizeWorkouts==='function'?normalizeWorkouts(raw):raw.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function projectRides(){
 return projectWorkouts().filter(w=>{
  if(typeof rideWorkout==='function') return rideWorkout(w);
  return Number(w.distance||0)>0;
 });
}
function projectDaysLeft(){
 const today=new Date();today.setHours(0,0,0,0);
 const event=new Date(`${DOCH20_PROJECT.eventDate}T00:00:00`);
 return Math.max(0,Math.ceil((event-today)/86400000));
}
function projectTimeProgress(){
 const start=new Date(`${DOCH20_PROJECT.startDate}T00:00:00`);
 const end=new Date(`${DOCH20_PROJECT.eventDate}T00:00:00`);
 const now=new Date();
 const total=Math.max(1,end-start);
 const elapsed=Math.max(0,Math.min(total,now-start));
 const totalWeeks=Math.max(1,Math.ceil(total/604800000));
 const currentWeek=Math.max(1,Math.min(totalWeeks,Math.ceil(elapsed/604800000)));
 return {percent:Math.round(elapsed/total*100),currentWeek,totalWeeks};
}
function latestCheckin(){
 const checkins=(window.state&&Array.isArray(state.checkins))?state.checkins:[];
 return checkins.slice().sort((a,b)=>String(b.checkin_date||b.date||'').localeCompare(String(a.checkin_date||a.date||'')))[0]||{};
}
function scoreModel(){
 const rides=projectRides();
 const checkin=latestCheckin();
 const now=new Date();

 const d28=new Date(now);d28.setDate(d28.getDate()-27);
 const d56=new Date(now);d56.setDate(d56.getDate()-55);
 const recent28=rides.filter(w=>safeLocalDate(w.date)>=d28);
 const recent56=rides.filter(w=>safeLocalDate(w.date)>=d56);

 const weekKeys=new Set(recent28.map(w=>{
  const d=safeLocalDate(w.date);
  const copy=new Date(d);
  const day=(copy.getDay()+6)%7;
  copy.setDate(copy.getDate()-day);
  return copy.toISOString().slice(0,10);
 }));
 const consistency=Math.min(100,Math.round(weekKeys.size/4*100));
 const km28=recent28.reduce((s,w)=>s+Number(w.distance||0),0);
 const volume=Math.min(100,Math.round(km28/700*100));
 const longest=Math.max(0,...recent56.map(w=>Number(w.distance||0)));
 const longRide=Math.min(100,Math.round(longest/200*100));

 const sleep=Number(checkin.sleep_hours||checkin.sleep||0);
 const fatigue=Number(checkin.fatigue||0);
 const knee=Number(checkin.knee_pain||checkin.knee||0);
 const recovery=sleep>0?Math.max(0,Math.min(100,Math.round((sleep/8)*72+(10-fatigue)*2.8))):72;
 const health=Math.max(0,Math.min(100,100-knee*10));

 const score=Math.round(
  consistency*.24+
  volume*.20+
  longRide*.18+
  recovery*.20+
  health*.18
 );

 return {
  score,
  consistency,
  volume,
  longRide,
  recovery,
  health,
  longest,
  status:score>=85?'Preparación alta':score>=70?'Preparación adecuada':score>=50?'Atención':'En construcción'
 };
}
function coachModel(s){
 const rides=projectRides();
 const lastLong=rides.find(w=>Number(w.distance||0)>=150);
 const daysSinceLong=lastLong?Math.floor((new Date()-safeLocalDate(lastLong.date))/86400000):null;

 if(s.health<60){
  return {
   observation:'La rodilla requiere cautela.',
   risk:'Aumentar el volumen ahora puede agravar el dolor.',
   action:'Reduce la carga y prioriza kinesiología y recuperación.'
  };
 }
 if(daysSinceLong===null||daysSinceLong>18){
  return {
   observation:'La consistencia reciente es adecuada.',
   risk:'Falta exposición a fondos largos.',
   action:'Planifica una salida progresiva de 150 a 200 km durante los próximos 10 días.'
  };
 }
 if(s.recovery<65){
  return {
   observation:'La carga reciente está siendo absorbida con dificultad.',
   risk:'La recuperación puede limitar el siguiente bloque.',
   action:'Prioriza sueño y una sesión suave antes de volver a aumentar volumen.'
  };
 }
 return {
  observation:'El proyecto avanza según lo planificado.',
  risk:'No se detectan riesgos críticos.',
  action:'Mantén la progresión y prepara el siguiente fondo.'
 };
}
function nextMilestone(longest){
 const milestones=[100,150,200,300,400,600,1000];
 return milestones.find(v=>v>longest)||1000;
}
function activityLabel(w){
 const distance=Number(w.distance||0);
 if(distance>=150)return 'Fondo largo';
 if(distance>=80)return 'Salida de resistencia';
 if(distance>0)return 'Salida aeróbica';
 return w.activity_name||w.type||'Entrenamiento';
}
function renderProjectNavigation(active='project'){
 const nav=document.querySelector('.bottom-nav');
 if(!nav)return;
 nav.innerHTML=`
  <button class="${active==='project'?'active':''}" onclick="projectHome()">${UI.icon('home')}<span>Proyecto</span></button>
  <button class="${active==='today'?'active':''}" onclick="typeof todayModule==='function'?todayModule():calendarModule()">${UI.icon('today')}<span>Hoy</span></button>
  <button class="${active==='progress'?'active':''}" onclick="performanceModule()">${UI.icon('progress')}<span>Progreso</span></button>
  <button class="${active==='state'?'active':''}" onclick="recoveryModule()">${UI.icon('heart')}<span>Estado</span></button>
  <button class="${active==='equipment'?'active':''}" onclick="bikeModule()">${UI.icon('bike')}<span>Equipo</span></button>`;
}
function projectHome(){
 const timeline=projectTimeProgress();
 const days=projectDaysLeft();
 const s=scoreModel();
 const coach=coachModel(s);
 const milestone=nextMilestone(s.longest);
 const recent=projectWorkouts().slice(0,4);

 view.innerHTML=`
 <main class="project-screen">
  <header class="project-screen-header">
   <div class="project-brand">DOCH<span>20</span></div>
   <div class="project-intro">Buenos días, Héctor.<strong>Así va tu proyecto.</strong></div>
  </header>

  <section class="project-hero">
   <div class="project-kicker">PROYECTO ACTIVO</div>
   <h1>${UI.escape(DOCH20_PROJECT.title)}</h1>
   <div class="project-event">${new Date(DOCH20_PROJECT.eventDate+'T00:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}</div>
   <div class="project-countdown"><strong>${days}</strong><span>días<br>restantes</span></div>
   ${UI.progress(timeline.percent,`Semana ${timeline.currentWeek} de ${timeline.totalWeeks}`)}
   <div class="project-meta"><span>Fase actual</span><b>${UI.escape(DOCH20_PROJECT.phase)}</b></div>
  </section>

  <section class="project-score-module">
   <div class="project-kicker">ÍNDICE DOCH20</div>
   <div class="project-score-main">
    <div>
     <strong>${s.score}</strong>
     <span>${UI.escape(s.status)}</span>
    </div>
    <div class="project-score-ring" style="--score:${s.score}">
     <i></i>
    </div>
   </div>
   <div class="project-score-grid">
    <div><span>Consistencia</span><b>${s.consistency}</b></div>
    <div><span>Volumen</span><b>${s.volume}</b></div>
    <div><span>Fondos</span><b>${s.longRide}</b></div>
    <div><span>Recuperación</span><b>${s.recovery}</b></div>
   </div>
  </section>

  <section class="project-coach-module">
   <div class="project-kicker">COACH</div>
   <div class="coach-line"><span>Observación</span><p>${UI.escape(coach.observation)}</p></div>
   <div class="coach-line"><span>Riesgo</span><p>${UI.escape(coach.risk)}</p></div>
   <div class="coach-line coach-line-action"><span>Acción</span><p>${UI.escape(coach.action)}</p></div>
   ${UI.button('Abrir análisis','coachModule()','secondary')}
  </section>

  <section class="project-milestone-module">
   <div class="project-kicker">PRÓXIMO HITO</div>
   <div class="milestone-layout">
    <div><strong>${milestone} km</strong><span>Mayor salida: ${s.longest.toFixed(0)} km</span></div>
    <div class="milestone-gap">${Math.max(0,milestone-s.longest).toFixed(0)}<small>km pendientes</small></div>
   </div>
   ${UI.progress(Math.min(100,s.longest/milestone*100),'Camino al próximo hito')}
   ${UI.button('Preparar salida',"typeof todayModule==='function'?todayModule():calendarModule()",'primary')}
  </section>

  <section class="project-journal-module">
   <div class="project-section-title"><div class="project-kicker">BITÁCORA RECIENTE</div><button onclick="diaryModule()">Ver toda</button></div>
   ${recent.length?`<div class="project-activity-list">${recent.map(w=>`
    <button class="project-activity" onclick="diaryModule()">
     <time>${UI.escape(w.date||'')}</time>
     <div><strong>${UI.escape(activityLabel(w))}</strong><span>${Number(w.distance||0).toFixed(1)} km · ${typeof durationLabel==='function'?durationLabel(w.duration):`${Number(w.duration||0)} min`}</span></div>
     ${UI.icon('arrow',17)}
    </button>`).join('')}</div>`:'<p class="project-empty">Todavía no hay actividades registradas.</p>'}
  </section>
 </main>`;
 renderProjectNavigation('project');
}
window.projectHome=projectHome;
window.dashboardModule=projectHome;
window.home=projectHome;
