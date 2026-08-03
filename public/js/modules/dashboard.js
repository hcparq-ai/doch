
function parseLocalDate(date){
 const [y,m,d]=String(date||'').split('-').map(Number);
 return new Date(y||1970,(m||1)-1,d||1);
}
function startOfWeek(d=new Date()){
 const x=new Date(d);const day=(x.getDay()+6)%7;
 x.setHours(0,0,0,0);x.setDate(x.getDate()-day);return x;
}
function startOfMonth(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),1)}
function sumWorkout(list,key){return list.reduce((s,x)=>s+(Number(x[key])||0),0)}
function dashboardStats(){
 const all=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 const now=new Date(),week=startOfWeek(now),month=startOfMonth(now);
 const weekly=all.filter(x=>parseLocalDate(x.date)>=week);
 const monthly=all.filter(x=>parseLocalDate(x.date)>=month);
 const rides=all.filter(x=>typeof rideWorkout==='function'?rideWorkout(x):['ruta','gravel','rodillo','brevet'].includes(x.type));
 const hr=rides.map(x=>Number(x.average_heartrate)).filter(x=>x>0);
 const watts=rides.map(x=>Number(x.average_watts)).filter(x=>x>0);
 const longest=[...rides].sort((a,b)=>(Number(b.distance)||0)-(Number(a.distance)||0))[0]||null;
 const latest=[...all].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
 const weeks=[];
 for(let i=7;i>=0;i--){
  const start=startOfWeek(new Date(now.getFullYear(),now.getMonth(),now.getDate()-i*7));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const list=rides.filter(x=>{const d=parseLocalDate(x.date);return d>=start&&d<end});
  weeks.push({label:`${start.getDate()}/${start.getMonth()+1}`,km:sumWorkout(list,'distance')});
 }
 return {
  all,rides,weekly,monthly,longest,latest,weeks,
  weekKm:sumWorkout(weekly.filter(x=>rides.includes(x)),'distance'),
  weekHours:sumWorkout(weekly,'duration')/60,
  weekElevation:sumWorkout(weekly,'elevation'),
  monthKm:sumWorkout(monthly.filter(x=>rides.includes(x)),'distance'),
  monthHours:sumWorkout(monthly,'duration')/60,
  avgHr:hr.length?hr.reduce((a,b)=>a+b,0)/hr.length:0,
  avgWatts:watts.length?watts.reduce((a,b)=>a+b,0)/watts.length:0,
  totalKm:sumWorkout(rides,'distance')
 };
}
function activityPeriodMessage(stats){
 if(!stats.all.length)return {week:'Sin datos cargados',month:'Sin datos cargados'};
 return {
  week:stats.weekly.length?'Actividad registrada':'Sin actividad esta semana',
  month:stats.monthly.length?'Actividad registrada':'Sin actividad este mes'
 };
}
function dashboardRecommendation(){
 if(typeof performanceData!=='function')return {title:'Sincroniza tus actividades',text:'Conecta Strava para activar recomendaciones personalizadas.',cls:'balance-neutral'};
 return performanceRecommendation(performanceData());
}
function renderDashboard(){
 const s=dashboardStats(),quality=typeof dataQualityReport==='function'?dataQualityReport():null,period=activityPeriodMessage(s);
 const maxWeek=Math.max(...s.weeks.map(x=>x.km),1);
 const days=Math.max(0,Math.ceil((new Date('2026-10-09T00:00:00')-new Date())/86400000));
 const targetWeekly=250;
 const weeklyStatus=s.weekKm>=targetWeekly?'Objetivo semanal cumplido':`${Math.max(0,targetWeekly-s.weekKm).toFixed(0)} km por completar`;
 const last=s.latest,rec=dashboardRecommendation();
 const longest=Number(s.longest?.distance||0);
 const milestones=[200,300,400,600,1000];
 const completed=milestones.filter(km=>longest>=km).length;
 const preparation=Math.round(Math.min(100,(completed/milestones.length)*55+Math.min(1,s.weeks.slice(-4).reduce((a,x)=>a+x.km,0)/1000)*45));
 view.innerHTML=`<div class="section-title"><h2>Dashboard</h2><span class="badge">DATOS REALES</span></div>
 <div class="card recommendation-card"><div class="eyebrow">DOCH20 HOY</div><h2 class="${rec.cls}">${rec.title}</h2><p class="muted">${rec.text}</p><button class="secondary" onclick="performanceModule()">VER PERFORMANCE</button></div>
 <section class="hero"><div class="eyebrow">Preparación brevet 1.000 km</div><h1>${preparation}% estimado</h1><p class="muted">Mayor salida: ${longest.toFixed(0)} km · ${days} días al objetivo</p><div class="progress"><i style="width:${preparation}%"></i></div></section>
 <div class="dashboard-grid">
  <div class="card"><div class="tiny">KM ESTA SEMANA</div><div class="dashboard-number">${s.weekKm.toFixed(0)} <span class="dashboard-unit">km</span></div><div class="period-note">${period.week}</div></div>
  <div class="card"><div class="tiny">HORAS ESTA SEMANA</div><div class="dashboard-number">${s.weekHours.toFixed(1)} <span class="dashboard-unit">h</span></div><div class="period-note">${period.week}</div></div>
  <div class="card"><div class="tiny">DESNIVEL SEMANAL</div><div class="dashboard-number">${s.weekElevation.toFixed(0)} <span class="dashboard-unit">m+</span></div><div class="period-note">${period.week}</div></div>
  <div class="card"><div class="tiny">KM ESTE MES</div><div class="dashboard-number">${s.monthKm.toFixed(0)} <span class="dashboard-unit">km</span></div><div class="period-note">${period.month}</div></div>
 </div>
 <div class="card"><div class="eyebrow">Objetivo semanal</div><div class="bar"><span>${weeklyStatus}</span><b>${s.weekKm.toFixed(0)} / ${targetWeekly} km</b></div><div class="progress"><i style="width:${Math.min(100,s.weekKm/targetWeekly*100)}%"></i></div></div>
 <div class="card"><div class="eyebrow">Últimas 8 semanas</div>${s.weeks.some(x=>x.km>0)?`<div class="week-chart">${s.weeks.map(x=>`<div class="week-column"><b>${x.km.toFixed(0)}</b><i style="height:${Math.max(3,x.km/maxWeek*110)}px"></i><small>${x.label}</small></div>`).join('')}</div>`:'<p class="muted">No hay salidas de ciclismo dentro de estas ocho semanas.</p>'}</div>
 <div class="card"><div class="eyebrow">Métricas importadas</div><div class="metric-row"><div><b>${s.avgHr?s.avgHr.toFixed(0):'—'}</b><span>FC media</span></div><div><b>${s.avgWatts?s.avgWatts.toFixed(0):'—'}</b><span>Potencia media</span></div><div><b>${s.longest?longest.toFixed(0):'—'}</b><span>Salida más larga km</span></div></div></div>
 ${last?`<div class="card activity-highlight"><div class="eyebrow">Último registro real</div><h2>${last.activity_name||last.type}</h2><p class="muted">${last.date} · ${last.source||'DOCH20'}</p><div class="metric-row"><div><b>${Number(last.distance||0).toFixed(1)}</b><span>km</span></div><div><b>${durationLabel(last.duration)}</b><span>duración</span></div><div><b>${Number(last.elevation||0).toFixed(0)}</b><span>m+</span></div></div></div>`:''}
 <div class="card"><div class="eyebrow">Calidad de datos</div><div class="bar"><span>Registros cargados</span><b>${quality?.total??s.all.length}</b></div><div class="bar"><span>Actividades de ciclismo utilizables</span><b>${quality?.rideCount??s.rides.length}</b></div><div class="bar"><span>Origen Strava</span><b>${quality?.stravaCount??0}</b></div></div>`;
}
function legacyHome(){renderDashboard()}
