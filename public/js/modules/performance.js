function estimatedLoad(w){
 const duration=Math.max(0,Number(w.duration||0));
 const distance=Math.max(0,Number(w.distance||0));
 const elevation=Math.max(0,Number(w.elevation||0));
 const rpe=Number(w.rpe||0);
 const typeFactor={ruta:1,gravel:1.08,rodillo:.92,brevet:1.12,gimnasio:.75,kinesiologia:.35}[w.type]||1;
 const durationLoad=duration/60*35;
 const distanceLoad=distance*.22;
 const climbLoad=elevation/1000*12;
 const rpeFactor=rpe>0?Math.max(.65,Math.min(1.45,rpe/6)):1;
 return Math.max(0,(durationLoad+distanceLoad+climbLoad)*typeFactor*rpeFactor);
}
function dateRangeDays(days){
 const out=[],now=new Date();now.setHours(0,0,0,0);
 for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);out.push(dayKey(d))}
 return out;
}
function dailyLoads(days=90){
 const keys=dateRangeDays(days),map=Object.fromEntries(keys.map(k=>[k,0]));
 (state.workouts||[]).forEach(w=>{if(map[w.date]!==undefined)map[w.date]+=estimatedLoad(w)});
 return keys.map(date=>({date,load:map[date]}));
}
function ewma(values,days){
 const alpha=1/days;let value=0;
 return values.map(x=>{value=value+(x-value)*alpha;return value});
}
function performanceData(){
 const daily=dailyLoads(90);
 const loads=daily.map(x=>x.load);
 const fitness=ewma(loads,42);
 const fatigue=ewma(loads,7);
 const form=fitness.map((x,i)=>x-fatigue[i]);
 const current={
  fitness:fitness.at(-1)||0,
  fatigue:fatigue.at(-1)||0,
  form:form.at(-1)||0,
  today:loads.at(-1)||0
 };
 const weeks=[];
 for(let i=11;i>=0;i--){
  const start=startOfWeek(new Date(Date.now()-i*7*86400000));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const list=(state.workouts||[]).filter(w=>{const d=parseLocalDate(w.date);return d>=start&&d<end});
  weeks.push({
   label:`${start.getDate()}/${start.getMonth()+1}`,
   load:list.reduce((s,w)=>s+estimatedLoad(w),0),
   km:list.reduce((s,w)=>s+Number(w.distance||0),0),
   hours:list.reduce((s,w)=>s+Number(w.duration||0),0)/60
  });
 }
 const current4=weeks.slice(-4).reduce((s,w)=>s+w.load,0);
 const previous4=weeks.slice(-8,-4).reduce((s,w)=>s+w.load,0);
 const change=previous4>0?((current4-previous4)/previous4)*100:0;
 return {daily,current,weeks,current4,previous4,change};
}
function formLabel(v){
 if(v>8)return {text:'Fresco',cls:'balance-positive'};
 if(v>-8)return {text:'Equilibrado',cls:'balance-neutral'};
 return {text:'Fatiga acumulada',cls:'balance-negative'};
}
async function performanceModule(){
 await loadWorkouts();
 const p=performanceData(),label=formLabel(p.current.form);
 const max=Math.max(...p.weeks.map(x=>x.load),1);
 const currentWeek=p.weeks.at(-1)||{load:0,km:0,hours:0};
 const typeTotals={};
 (state.workouts||[]).forEach(w=>typeTotals[w.type]=(typeTotals[w.type]||0)+estimatedLoad(w));
 const types=Object.entries(typeTotals).sort((a,b)=>b[1]-a[1]);
 view.innerHTML=`<div class="section-title"><h2>Performance Center</h2><span class="badge">CARGA ESTIMADA</span></div>
 <section class="hero performance-hero"><div class="eyebrow">Estado actual</div><div class="performance-score ${label.cls}">${p.current.form.toFixed(0)}</div><h1>${label.text}</h1><p class="muted">Balance entre fitness de 42 días y fatiga de 7 días.</p></section>
 <div class="card"><div class="performance-grid">
  <div><b>${p.current.fitness.toFixed(0)}</b><span>FITNESS 42 DÍAS</span></div>
  <div><b>${p.current.fatigue.toFixed(0)}</b><span>FATIGA 7 DÍAS</span></div>
  <div><b class="${label.cls}">${p.current.form.toFixed(0)}</b><span>FORMA</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">Semana actual</div><div class="performance-grid">
  <div><b>${currentWeek.load.toFixed(0)}</b><span>CARGA</span></div>
  <div><b>${currentWeek.km.toFixed(0)}</b><span>KM</span></div>
  <div><b>${currentWeek.hours.toFixed(1)}</b><span>HORAS</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">Carga · últimas 12 semanas</div><div class="load-chart">${p.weeks.map(w=>`<div><b class="tiny">${w.load.toFixed(0)}</b><i style="height:${Math.max(3,w.load/max*125)}px"></i><small>${w.label}</small></div>`).join('')}</div></div>
 <div class="card ${Math.abs(p.change)>35?'maintenance-alert':''}"><div class="bar"><span>Cambio últimas 4 semanas</span><b class="${p.change>35?'balance-negative':p.change<-30?'balance-neutral':'balance-positive'}">${p.change>=0?'+':''}${p.change.toFixed(0)}%</b></div><p class="muted">${p.change>35?'El aumento es elevado. Conviene revisar fatiga, sueño y dolor antes de seguir aumentando volumen.':p.change<-30?'La carga bajó de forma importante; puede corresponder a recuperación o interrupción del plan.':'La progresión reciente se mantiene dentro de un rango moderado.'}</p></div>
 <div class="card"><div class="eyebrow">Distribución de carga</div>${types.length?types.map(([type,val])=>`<div class="bar"><span>${type}</span><b>${val.toFixed(0)}</b></div>`).join(''):'<p class="muted">Sin entrenamientos suficientes.</p>'}</div>
 <div class="card disclaimer-box"><b>Cómo se calcula</b><p class="muted">“Carga DOCH20” es una estimación interna basada en duración, distancia, desnivel, tipo de sesión y RPE cuando está disponible. No equivale a TSS, TRIMP ni a una medición clínica.</p></div>`;
}

