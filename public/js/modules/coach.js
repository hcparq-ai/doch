
const DOCH20_GOAL_DATE='2026-10-09';
const DOCH20_GOAL_DISTANCE=1000;

function daysToGoal(){
 const todayDate=new Date();
 todayDate.setHours(0,0,0,0);
 const target=new Date(`${DOCH20_GOAL_DATE}T00:00:00`);
 return Math.max(0,Math.ceil((target-todayDate)/86400000));
}
function coachLatestCheckin(){
 return (state.checkins||[]).slice().sort((a,b)=>String(b.checkin_date||'').localeCompare(String(a.checkin_date||'')))[0]||null;
}
function coachRecentRides(days=14){
 const cutoff=new Date();
 cutoff.setHours(0,0,0,0);
 cutoff.setDate(cutoff.getDate()-days+1);
 const list=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 return list.filter(w=>{
  const d=parseLocalDate(w.date);
  return d>=cutoff&&(typeof rideWorkout==='function'?rideWorkout(w):['ruta','gravel','rodillo','brevet'].includes(w.type));
 });
}
function coachTrainingSummary(){
 const rides14=coachRecentRides(14);
 const rides7=coachRecentRides(7);
 const km7=rides7.reduce((s,w)=>s+Number(w.distance||0),0);
 const hours7=rides7.reduce((s,w)=>s+Number(w.duration||0),0)/60;
 const elevation7=rides7.reduce((s,w)=>s+Number(w.elevation||0),0);
 const km14=rides14.reduce((s,w)=>s+Number(w.distance||0),0);
 const longest=[...rides14].sort((a,b)=>Number(b.distance||0)-Number(a.distance||0))[0]||null;
 const latest=rides14[0]||null;
 return {rides7,rides14,km7,hours7,elevation7,km14,longest,latest};
}
function coachStatus(){
 const perf=typeof performanceEngine==='function'?performanceEngine():null;
 const checkin=coachLatestCheckin();
 const summary=coachTrainingSummary();
 const form=Number(perf?.current?.tsb||0);
 const fatigue=Number(perf?.current?.atl||0);
 const fitness=Number(perf?.current?.ctl||0);
 const knee=Number(checkin?.knee_pain||0);
 const sleep=Number(checkin?.sleep_hours||0);
 const motivation=Number(checkin?.motivation||0);
 const fatigueSelf=Number(checkin?.fatigue||0);
 const days=daysToGoal();

 let level='green';
 let title='Mantén el plan';
 let session='2 h Z2';
 let duration='120 min';
 let intensity='Baja–moderada';
 let reason='La carga y la recuperación están dentro de un rango estable.';
 let note='Mantén una intensidad conversacional y termina con sensación de control.';

 if(knee>=6){
  level='red';title='Recuperación prioritaria';session='Descanso o movilidad suave';duration='20–40 min';intensity='Muy baja';
  reason='El dolor de rodilla informado es alto.';
  note='No fuerces la sesión. Sigue las indicaciones de tu kinesiólogo o médico.';
 }else if(knee>=4){
  level='amber';title='Reduce impacto y duración';session='Rodillo suave Z1–Z2';duration='45–75 min';intensity='Baja';
  reason='La rodilla requiere cautela antes de aumentar volumen.';
  note='Detén la sesión si el dolor aumenta durante el pedaleo.';
 }else if((sleep>0&&sleep<6)||fatigueSelf>=8){
  level='amber';title='Carga reducida';session='Recuperación activa';duration='40–60 min';intensity='Muy baja';
  reason='El sueño o la fatiga subjetiva no favorecen una sesión exigente.';
  note='Prioriza sueño, alimentación y movilidad.';
 }else if(form<-12||fatigue>fitness*1.45){
  level='red';title='Descanso recomendado';session='Descanso total o paseo muy suave';duration='0–45 min';intensity='Muy baja';
  reason='La fatiga reciente supera claramente al fitness acumulado.';
  note='Evita intensidad y fondos hasta recuperar balance.';
 }else if(form<-6){
  level='amber';title='Día aeróbico controlado';session='Z1–Z2 sin intensidad';duration='60–90 min';intensity='Baja';
  reason='Existe fatiga acumulada, aunque aún manejable.';
  note='No añadas series ni subidas fuertes.';
 }else if(form>10&&summary.km7<180&&knee<=2){
  level='green';title='Buen día para calidad';session='Tempo controlado o fondo Z2';duration='90–150 min';intensity='Moderada';
  reason='Estás relativamente fresco y el volumen semanal aún es moderado.';
  note='Mantén la calidad submáxima; el objetivo sigue siendo acumular resistencia.';
 }else if(summary.km7>300){
  level='amber';title='Consolida la carga';session='Recuperación activa o descanso';duration='30–60 min';intensity='Muy baja';
  reason='La semana ya tiene un volumen alto.';
  note='Deja que la adaptación ocurra antes de aumentar nuevamente.';
 }

 const targetWeekly=days>45?250:days>21?200:120;
 const weeklyProgress=Math.min(100,Math.round(summary.km7/targetWeekly*100));
 const nutrition={
  carbs:session.includes('Descanso')?0:session.includes('Recuperación')?30:session.includes('Z1')?35:session.includes('Z2')?50:65,
  water:session.includes('Descanso')?0:500,
  sodium:session.includes('Descanso')?0:400
 };

 return {
  level,title,session,duration,intensity,reason,note,
  days,targetWeekly,weeklyProgress,nutrition,
  perf,checkin,summary,motivation
 };
}
function coachLevelClass(level){
 return level==='green'?'coach-green':level==='amber'?'coach-amber':'coach-red';
}
function coachIcon(level){
 return level==='green'?'●':level==='amber'?'▲':'■';
}
function coachModule(){
 const c=coachStatus();
 const latest=c.summary.latest;
 view.innerHTML=`<div class="section-title"><h2>DOCH20 Coach</h2><span class="badge">V16.3</span></div>
 <section class="hero coach-hero ${coachLevelClass(c.level)}">
  <div class="eyebrow">RECOMENDACIÓN DE HOY</div>
  <div class="coach-signal">${coachIcon(c.level)}</div>
  <h1>${c.title}</h1>
  <p class="muted">${c.days} días para el brevet de ${DOCH20_GOAL_DISTANCE.toLocaleString('es-CL')} km.</p>
 </section>
 <div class="card coach-session">
  <div class="eyebrow">Sesión sugerida</div>
  <h2>${c.session}</h2>
  <div class="coach-session-grid">
   <div><b>${c.duration}</b><span>Duración</span></div>
   <div><b>${c.intensity}</b><span>Intensidad</span></div>
  </div>
  <p>${c.reason}</p>
  <p class="muted">${c.note}</p>
 </div>
 <div class="card">
  <div class="eyebrow">Estado del sistema</div>
  <div class="performance-grid">
   <div><b>${Number(c.perf?.current?.ctl||0).toFixed(0)}</b><span>FITNESS</span></div>
   <div><b>${Number(c.perf?.current?.atl||0).toFixed(0)}</b><span>FATIGA</span></div>
   <div><b>${Number(c.perf?.current?.tsb||0).toFixed(0)}</b><span>FORMA</span></div>
  </div>
 </div>
 <div class="card">
  <div class="eyebrow">Recuperación registrada</div>
  <div class="bar"><span>Sueño</span><b>${c.checkin?.sleep_hours?`${Number(c.checkin.sleep_hours).toFixed(1)} h`:'Sin registro'}</b></div>
  <div class="bar"><span>Fatiga subjetiva</span><b>${c.checkin?.fatigue??'—'}</b></div>
  <div class="bar"><span>Dolor de rodilla</span><b>${c.checkin?.knee_pain??'—'}/10</b></div>
  <div class="bar"><span>Motivación</span><b>${c.checkin?.motivation??'—'}/10</b></div>
  <button class="secondary" onclick="recoveryModule()">ACTUALIZAR RECUPERACIÓN</button>
 </div>
 <div class="card">
  <div class="eyebrow">Objetivo semanal</div>
  <div class="bar"><span>Volumen últimos 7 días</span><b>${c.summary.km7.toFixed(0)} / ${c.targetWeekly} km</b></div>
  <div class="progress"><i style="width:${c.weeklyProgress}%"></i></div>
  <div class="bar"><span>Horas</span><b>${c.summary.hours7.toFixed(1)} h</b></div>
  <div class="bar"><span>Desnivel</span><b>${c.summary.elevation7.toFixed(0)} m+</b></div>
 </div>
 ${latest?`<div class="card activity-highlight"><div class="eyebrow">Última salida</div><h2>${latest.activity_name||latest.type}</h2><p class="muted">${latest.date}</p><div class="metric-row"><div><b>${Number(latest.distance||0).toFixed(1)}</b><span>km</span></div><div><b>${durationLabel(latest.duration)}</b><span>duración</span></div><div><b>${Number(latest.elevation||0).toFixed(0)}</b><span>m+</span></div></div></div>`:''}
 <div class="card">
  <div class="eyebrow">Nutrición orientativa para la sesión</div>
  <div class="bar"><span>Carbohidratos</span><b>${c.nutrition.carbs} g/h</b></div>
  <div class="bar"><span>Agua</span><b>${c.nutrition.water} ml/h</b></div>
  <div class="bar"><span>Sodio</span><b>${c.nutrition.sodium} mg/h</b></div>
 </div>
 <div class="card disclaimer-box"><p class="muted">La recomendación se basa en tus datos registrados y es orientativa. No sustituye indicaciones médicas, de kinesiología ni de un entrenador profesional.</p></div>`;
}
