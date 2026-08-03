function dayKey(d){return d.toISOString().slice(0,10)}
function roadStats(){
 const all=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 const rides=all.filter(x=>typeof rideWorkout==='function'?rideWorkout(x):['ruta','gravel','rodillo','brevet'].includes(x.type));
 const byDay={};
 rides.forEach(x=>byDay[x.date]=(byDay[x.date]||0)+(Number(x.distance)||0));
 const longest=[...rides].sort((a,b)=>(Number(b.distance)||0)-(Number(a.distance)||0))[0]||null;
 const total=rides.reduce((s,x)=>s+(Number(x.distance)||0),0);
 const activeDays=new Set(rides.filter(x=>Number(x.distance)>0).map(x=>x.date)).size;
 const weeks=[];
 const now=new Date();
 for(let i=11;i>=0;i--){
  const start=startOfWeek(new Date(now.getFullYear(),now.getMonth(),now.getDate()-i*7));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const km=rides.filter(x=>{const d=parseLocalDate(x.date);return d>=start&&d<end}).reduce((s,x)=>s+(Number(x.distance)||0),0);
  weeks.push({label:`${start.getDate()}/${start.getMonth()+1}`,km});
 }
 let streak=0;
 for(let i=0;i<365;i++){
  const d=new Date(now);d.setDate(d.getDate()-i);
  const k=dayKey(d);
  if((byDay[k]||0)>0)streak++;
  else if(i>0)break;
 }
 const heat=[];
 for(let i=97;i>=0;i--){
  const d=new Date(now);d.setDate(d.getDate()-i);
  const km=byDay[dayKey(d)]||0;
  heat.push({date:dayKey(d),km});
 }
 return {rides,total,longest,activeDays,weeks,streak,heat};
}
function heatClass(km){
 if(km<=0)return '';
 if(km<30)return 'l1';
 if(km<70)return 'l2';
 if(km<130)return 'l3';
 return 'l4';
}
function renderRoadToParis(){
 const s=roadStats();
 const stages=[200,300,400,600,1000,1200];
 const longest=Number(s.longest?.distance||0);
 const maxWeek=Math.max(...s.weeks.map(x=>x.km),1);
 const recent=s.weeks.slice(-4).reduce((a,x)=>a+x.km,0);
 const target4=1000;
 const readiness=Math.min(100,Math.round((recent/target4)*100));
 view.innerHTML=`<div class="section-title"><h2>Road to Paris</h2><span class="badge">PBP 2027</span></div>
 <section class="hero"><div class="eyebrow">Volumen de ciclismo registrado</div><h1>${s.total.toFixed(0)} km</h1><p class="muted">Salida más larga: ${longest.toFixed(0)} km · ${s.activeDays} días activos</p><div class="progress"><i style="width:${Math.min(100,s.total/1200*100)}%"></i></div></section>
 <div class="card"><div class="eyebrow">Escalera brevet</div>${stages.map(k=>{const pct=Math.min(100,longest/k*100);return `<div class="road-stage ${longest>=k?'done':''}"><div class="stage-km">${k} km</div><div class="progress"><i style="width:${pct}%"></i></div><div>${longest>=k?'✓':Math.round(pct)+'%'}</div></div>`}).join('')}</div>
 <div class="card"><div class="eyebrow">Estado reciente</div><div class="road-kpi"><div><b>${recent.toFixed(0)}</b><span>km / 4 semanas</span></div><div><b>${readiness}%</b><span>volumen objetivo</span></div><div><b>${s.streak}</b><span>racha actual</span></div></div></div>
 <div class="card"><div class="eyebrow">Carga diaria · 14 semanas</div><div class="heatmap">${s.heat.map(x=>`<i class="heat-day ${heatClass(x.km)}" title="${x.date}: ${x.km.toFixed(0)} km"></i>`).join('')}</div><div class="heat-legend"><span class="tiny">Menos</span><i class="heat-day l1"></i><i class="heat-day l2"></i><i class="heat-day l3"></i><i class="heat-day l4"></i><span class="tiny">Más</span></div></div>
 <div class="card"><div class="eyebrow">Últimas 12 semanas</div><div class="volume-bars">${s.weeks.map(x=>`<div><b class="tiny">${x.km.toFixed(0)}</b><i style="height:${Math.max(3,x.km/maxWeek*110)}px"></i><small>${x.label}</small></div>`).join('')}</div></div>
 <div class="card"><div class="bar"><span>Próximo objetivo</span><b>${longest<200?'200 km':longest<300?'300 km':longest<400?'400 km':longest<600?'600 km':longest<1000?'1.000 km':'PBP 1.200 km'}</b></div><div class="bar"><span>Mayor distancia registrada</span><b>${longest.toFixed(1)} km</b></div><div class="bar"><span>Diagnóstico</span><b class="${readiness>=75?'status-good':'status-warn'}">${readiness>=75?'Volumen sólido':'Seguir acumulando base'}</b></div></div>`;
}


