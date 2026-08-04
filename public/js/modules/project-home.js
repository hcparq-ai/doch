
const DOCH20_ACTIVE_PROJECT={
 title:'Brevet 1000 km',
 eventDate:'2026-10-09',
 startDate:'2026-06-19',
 targetDistance:1000,
 phases:['Base','Construcción','Especificidad','Afinación','Evento'],
 currentPhase:'Construcción'
};

function projectDaysRemaining(project=DOCH20_ACTIVE_PROJECT){
 const now=new Date();now.setHours(0,0,0,0);
 const target=new Date(`${project.eventDate}T00:00:00`);
 return Math.max(0,Math.ceil((target-now)/86400000));
}
function projectTimeline(project=DOCH20_ACTIVE_PROJECT){
 const start=new Date(`${project.startDate}T00:00:00`);
 const end=new Date(`${project.eventDate}T00:00:00`);
 const now=new Date();
 const total=Math.max(1,end-start);
 const elapsed=Math.max(0,Math.min(total,now-start));
 const progress=Math.round(elapsed/total*100);
 const totalWeeks=Math.max(1,Math.ceil(total/604800000));
 const currentWeek=Math.max(1,Math.min(totalWeeks,Math.ceil(elapsed/604800000)));
 return {progress,totalWeeks,currentWeek};
}
function projectScoreData(){
 const workouts=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 const rides=workouts.filter(w=>typeof rideWorkout==='function'?rideWorkout(w):Number(w.distance)>0);
 const checkin=(state.checkins||[]).slice().sort((a,b)=>String(b.checkin_date||'').localeCompare(String(a.checkin_date||'')))[0]||{};
 const perf=typeof performanceEngine==='function'?performanceEngine():null;

 const now=new Date();
 const cutoff28=new Date(now);cutoff28.setDate(cutoff28.getDate()-27);
 const cutoff56=new Date(now);cutoff56.setDate(cutoff56.getDate()-55);
 const recent28=rides.filter(w=>parseLocalDate(w.date)>=cutoff28);
 const recent56=rides.filter(w=>parseLocalDate(w.date)>=cutoff56);
 const activeWeeks=new Set(recent28.map(w=>{
  const d=startOfWeek(parseLocalDate(w.date));return d.toISOString().slice(0,10);
 })).size;

 const consistency=Math.min(100,Math.round(activeWeeks/4*100));
 const volume28=recent28.reduce((s,w)=>s+Number(w.distance||0),0);
 const specificVolume=Math.min(100,Math.round(volume28/750*100));
 const longest56=Math.max(0,...recent56.map(w=>Number(w.distance||0)));
 const longRideScore=Math.min(100,Math.round(longest56/200*100));

 const sleep=Number(checkin.sleep_hours||0);
 const fatigue=Number(checkin.fatigue||0);
 const recovery=sleep?Math.max(0,Math.min(100,Math.round((sleep/8)*70+(10-fatigue)*3))):70;

 const knee=Number(checkin.knee_pain||0);
 const health=Math.max(0,Math.min(100,100-knee*10));
 const equipment=80;
 const timeScore=projectDaysRemaining()>45?85:projectDaysRemaining()>21?75:65;

 const score=Math.round(
  consistency*.20+
  specificVolume*.18+
  longRideScore*.17+
  recovery*.20+
  health*.15+
  equipment*.05+
  timeScore*.05
 );

 const status=score>=85?'Preparación alta':score>=70?'Preparación adecuada':score>=50?'Atención':'Riesgo';
 const tone=score>=85?'success':score>=70?'yellow':score>=50?'yellow':'critical';
 return {score,status,tone,consistency,specificVolume,longRideScore,recovery,health,equipment,perf};
}
function projectCoachMessage(scoreData){
 const days=projectDaysRemaining();
 const workouts=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 const rides=workouts.filter(w=>typeof rideWorkout==='function'?rideWorkout(w):Number(w.distance)>0);
 const longest=Math.max(0,...rides.map(w=>Number(w.distance||0)));
 const lastLong=rides.find(w=>Number(w.distance||0)>=150);
 let daysSinceLong=null;
 if(lastLong){
  daysSinceLong=Math.floor((new Date()-parseLocalDate(lastLong.date))/86400000);
 }

 if(scoreData.health<60){
  return {
   observation:'El dolor registrado requiere cautela.',
   risk:'Aumentar volumen ahora puede agravar la rodilla.',
   action:'Reduce la carga y prioriza recuperación y kinesiología.'
  };
 }
 if(daysSinceLong===null||daysSinceLong>18){
  return {
   observation:'La consistencia general es adecuada.',
   risk:'Falta exposición reciente a fondos largos.',
   action:`Planifica una salida progresiva de 150 a 200 km dentro de los próximos ${Math.min(14,Math.max(7,Math.round(days/5)))} días.`
  };
 }
 if(scoreData.recovery<65){
  return {
   observation:'La carga está siendo absorbida con dificultad.',
   risk:'La recuperación actual limita el beneficio del siguiente entrenamiento.',
   action:'Prioriza sueño y una sesión suave antes de volver a aumentar volumen.'
  };
 }
 return {
  observation:'El proyecto avanza según lo planificado.',
  risk:'No se detectan riesgos críticos en los datos disponibles.',
  action:'Mantén la progresión y prepara el siguiente fondo largo.'
 };
}
function projectNextMilestone(){
 const rides=(typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[])
  .filter(w=>typeof rideWorkout==='function'?rideWorkout(w):Number(w.distance)>0);
 const longest=Math.max(0,...rides.map(w=>Number(w.distance||0)));
 const milestones=[100,150,200,300,400,600,1000];
 const next=milestones.find(x=>x>longest)||1000;
 return {next,longest};
}
function recentProjectActivities(limit=3){
 const workouts=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 return workouts.slice(0,limit);
}
function projectHome(){
 const project=DOCH20_ACTIVE_PROJECT;
 const days=projectDaysRemaining(project);
 const timeline=projectTimeline(project);
 const score=projectScoreData();
 const coach=projectCoachMessage(score);
 const milestone=projectNextMilestone();
 const recent=recentProjectActivities();

 const projectCard=UI.card({
  className:'project-hero-card',
  eyebrow:'PROYECTO ACTIVO',
  body:`<div class="project-title">${UI.escape(project.title)}</div>
   <div class="project-date">${new Date(project.eventDate+'T00:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}</div>
   <div class="project-days"><strong>${days}</strong><span>días restantes</span></div>
   ${UI.progress(timeline.progress,`Semana ${timeline.currentWeek} de ${timeline.totalWeeks}`)}
   <div class="project-phase"><span>Fase actual</span><b>${UI.escape(project.currentPhase)}</b></div>`
 });

 const scoreCard=UI.card({
  className:'score-card',
  eyebrow:'ÍNDICE DOCH20',
  body:`<div class="score-value">${score.score}</div>
   <div class="score-status">${UI.badge(score.status,score.tone)}</div>
   <div class="score-dimensions">
    <div><span>Consistencia</span><b>${score.consistency}</b></div>
    <div><span>Volumen</span><b>${score.specificVolume}</b></div>
    <div><span>Fondos</span><b>${score.longRideScore}</b></div>
    <div><span>Recuperación</span><b>${score.recovery}</b></div>
   </div>`
 });

 const coachCard=UI.card({
  className:'coach-note-card',
  eyebrow:'COACH',
  body:`<div class="coach-note-row"><span>Observación</span><p>${UI.escape(coach.observation)}</p></div>
   <div class="coach-note-row"><span>Riesgo</span><p>${UI.escape(coach.risk)}</p></div>
   <div class="coach-note-row coach-action"><span>Acción</span><p>${UI.escape(coach.action)}</p></div>`,
  action:UI.button('Abrir Coach','coachModule()','secondary','arrow')
 });

 const milestoneCard=UI.card({
  className:'milestone-card',
  eyebrow:'PRÓXIMO HITO',
  body:`<div class="milestone-value">${milestone.next} km</div>
   <p class="ds-muted">Mayor salida registrada: ${milestone.longest.toFixed(0)} km</p>
   ${UI.progress(Math.min(100,milestone.longest/milestone.next*100),`${Math.max(0,milestone.next-milestone.longest).toFixed(0)} km para alcanzar el hito`)}`,
  action:UI.button('Preparar hito','todayModule()','primary','arrow')
 });

 const activities=UI.card({
  className:'recent-card',
  eyebrow:'BITÁCORA RECIENTE',
  body:recent.length?`<div class="activity-list">${recent.map(w=>`
   <button class="activity-row" onclick="diaryModule()">
    <div><span>${UI.escape(w.date)}</span><b>${UI.escape(w.activity_name||w.type||'Actividad')}</b></div>
    <div class="activity-metrics"><strong>${Number(w.distance||0).toFixed(1)} km</strong><small>${typeof durationLabel==='function'?durationLabel(w.duration):`${Number(w.duration||0)} min`}</small></div>
   </button>`).join('')}</div>`:'<p class="ds-muted">Todavía no hay actividades registradas.</p>'
 });

 view.innerHTML=`<div class="project-home">
  <header class="project-header">
   <div><span class="project-greeting">Buenos días, Héctor.</span><h1>Así va tu proyecto.</h1></div>
   <button class="icon-button" onclick="moreModule()" aria-label="Más opciones">${UI.icon('arrow',20)}</button>
  </header>
  ${projectCard}
  ${scoreCard}
  ${coachCard}
  ${milestoneCard}
  ${activities}
 </div>`;
 updateBetaNavigation('project');
}
function updateBetaNavigation(active='project'){
 const nav=document.querySelector('.bottom-nav');
 if(!nav)return;
 nav.innerHTML=`
  <button class="${active==='project'?'active':''}" onclick="projectHome()">${UI.icon('home')}<span>Proyecto</span></button>
  <button class="${active==='today'?'active':''}" onclick="todayModule()">${UI.icon('today')}<span>Hoy</span></button>
  <button class="${active==='progress'?'active':''}" onclick="performanceModule()">${UI.icon('progress')}<span>Progreso</span></button>
  <button class="${active==='state'?'active':''}" onclick="recoveryModule()">${UI.icon('heart')}<span>Estado</span></button>
  <button class="${active==='equipment'?'active':''}" onclick="bikeModule()">${UI.icon('bike')}<span>Equipo</span></button>`;
}
