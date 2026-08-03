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
 const all=state.workouts||[];
 const now=new Date(),week=startOfWeek(now),month=startOfMonth(now);
 const weekly=all.filter(x=>parseLocalDate(x.date)>=week);
 const monthly=all.filter(x=>parseLocalDate(x.date)>=month);
 const rides=all.filter(x=>['ruta','gravel','rodillo','brevet'].includes(x.type));
 const hr=rides.map(x=>Number(x.average_heartrate)).filter(x=>x>0);
 const watts=rides.map(x=>Number(x.average_watts)).filter(x=>x>0);
 const longest=[...rides].sort((a,b)=>(Number(b.distance)||0)-(Number(a.distance)||0))[0]||null;
 const latest=[...all].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
 const weeks=[];
 for(let i=7;i>=0;i--){
  const start=startOfWeek(new Date(now.getFullYear(),now.getMonth(),now.getDate()-i*7));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const list=all.filter(x=>{const d=parseLocalDate(x.date);return d>=start&&d<end});
  weeks.push({label:`${start.getDate()}/${start.getMonth()+1}`,km:sumWorkout(list,'distance')});
 }
 return {
  all,weekly,monthly,longest,latest,weeks,
  weekKm:sumWorkout(weekly,'distance'),
  weekHours:sumWorkout(weekly,'duration')/60,
  weekElevation:sumWorkout(weekly,'elevation'),
  monthKm:sumWorkout(monthly,'distance'),
  monthHours:sumWorkout(monthly,'duration')/60,
  avgHr:hr.length?hr.reduce((a,b)=>a+b,0)/hr.length:0,
  avgWatts:watts.length?watts.reduce((a,b)=>a+b,0)/watts.length:0,
  totalKm:sumWorkout(all,'distance')
 };
}
function renderDashboard(){
 const s=dashboardStats();
 const maxWeek=Math.max(...s.weeks.map(x=>x.km),1);
 const goal=1000,pct=Math.min(100,Math.round(s.totalKm/goal*100));
 const days=Math.max(0,Math.ceil((new Date('2026-10-09T00:00:00')-new Date())/86400000));
 const targetWeekly=250;
 const weeklyStatus=s.weekKm>=targetWeekly?'Objetivo semanal cumplido':`${Math.max(0,targetWeekly-s.weekKm).toFixed(0)} km por completar`;
 const last=s.latest;
 view.innerHTML=`<div class="section-title"><h2>Dashboard</h2><span class="badge">STRAVA + DOCH20</span></div>
 <section class="hero"><div class="eyebrow">Road to 1.000 km</div><h1>${pct}% completado</h1><p class="muted">${s.totalKm.toFixed(0)} km registrados · ${days} días al objetivo</p><div class="progress"><i style="width:${pct}%"></i></div></section>
 <div class="dashboard-grid">
  <div class="card"><div class="tiny">KM ESTA SEMANA</div><div class="dashboard-number">${s.weekKm.toFixed(0)} <span class="dashboard-unit">km</span></div></div>
  <div class="card"><div class="tiny">HORAS ESTA SEMANA</div><div class="dashboard-number">${s.weekHours.toFixed(1)} <span class="dashboard-unit">h</span></div></div>
  <div class="card"><div class="tiny">DESNIVEL SEMANAL</div><div class="dashboard-number">${s.weekElevation.toFixed(0)} <span class="dashboard-unit">m+</span></div></div>
  <div class="card"><div class="tiny">KM ESTE MES</div><div class="dashboard-number">${s.monthKm.toFixed(0)} <span class="dashboard-unit">km</span></div></div>
 </div>
 <div class="card"><div class="eyebrow">Objetivo semanal</div><div class="bar"><span>${weeklyStatus}</span><b>${s.weekKm.toFixed(0)} / ${targetWeekly} km</b></div><div class="progress"><i style="width:${Math.min(100,s.weekKm/targetWeekly*100)}%"></i></div></div>
 <div class="card"><div class="eyebrow">Últimas 8 semanas</div><div class="week-chart">${s.weeks.map(x=>`<div class="week-column"><b>${x.km.toFixed(0)}</b><i style="height:${Math.max(3,x.km/maxWeek*110)}px"></i><small>${x.label}</small></div>`).join('')}</div></div>
 <div class="card"><div class="eyebrow">Métricas importadas</div><div class="metric-row"><div><b>${s.avgHr?s.avgHr.toFixed(0):'—'}</b><span>FC media</span></div><div><b>${s.avgWatts?s.avgWatts.toFixed(0):'—'}</b><span>Potencia media</span></div><div><b>${s.longest?Number(s.longest.distance).toFixed(0):'—'}</b><span>Salida más larga km</span></div></div></div>
 ${last?`<div class="card activity-highlight"><div class="eyebrow">Último registro</div><h2>${last.activity_name||last.type}</h2><p class="muted">${last.date}</p><div class="metric-row"><div><b>${Number(last.distance||0).toFixed(1)}</b><span>km</span></div><div><b>${durationLabel(last.duration)}</b><span>duración</span></div><div><b>${last.elevation||0}</b><span>m+</span></div></div></div>`:''}
 <div class="card"><div class="bar"><span>Sesiones totales</span><b>${s.all.length}</b></div><div class="bar"><span>Horas este mes</span><b>${s.monthHours.toFixed(1)} h</b></div><div class="bar"><span>Origen de datos</span><b>DOCH20 + Strava</b></div></div>`;
}

function legacyHome(){const n=next(),pct=Math.round(done()/Math.max(plan.length,1)*100),days=Math.max(0,Math.ceil((new Date('2027-08-15')-new Date())/86400000));view.innerHTML=`<section class="hero"><div class="eyebrow">Misión de hoy</div><h1>${n.title}</h1><p class="muted">${n.time}${n.km?` · ${n.km} km`:''}${n.zone?` · ${n.zone}`:''}</p><p class="tiny">${n.route||n.type}</p><button class="primary" onclick="openSession(${plan.indexOf(n)})">INICIAR / REGISTRAR</button></section><div class="grid"><div class="card"><div class="tiny">DÍAS A PBP</div><div class="metric">${days}</div></div><div class="card"><div class="tiny">KM REALIZADOS</div><div class="metric">${realKm().toFixed(0)}</div></div></div><div class="card"><div class="eyebrow">Perfil</div><div class="cloud-state"><i class="cloud-dot ${cloud.user?'on':'off'}"></i>${cloud.user?'Sincronización activa':'Datos guardados en este dispositivo'}</div><div class="bar"><b>${state.profile.name}</b><span>${state.profile.weight} kg</span></div><div class="bar"><span>${state.profile.goal}</span><span>${state.profile.goalDate}</span></div></div><div class="card"><div class="eyebrow">Resumen real</div><div class="bar"><span>Entrenamientos del diario</span><b>${(state.workouts||[]).length}</b></div><div class="bar"><span>Kilómetros registrados</span><b>${(state.workouts||[]).reduce((s,x)=>s+(Number(x.distance)||0),0).toFixed(0)} km</b></div></div><div class="card"><div class="eyebrow">Road to Paris</div><div class="bar"><b>PBP 1200 km</b><span>${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div><div class="section-title"><h2>Próximas sesiones</h2></div><div class="card">${plan.filter(x=>x.date>=today()).slice(0,5).map(item).join('')}</div>`}

