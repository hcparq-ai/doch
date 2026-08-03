
function normalizedWorkoutType(w){
 const raw=String(w.type||w.sport_type||'').toLowerCase();
 if(raw.includes('virtual'))return 'rodillo';
 if(raw.includes('gravel')||raw.includes('mountain'))return 'gravel';
 if(raw.includes('ride')||raw.includes('ruta')||raw.includes('bike'))return 'ruta';
 return raw||'otro';
}
function estimatedLoad(w){
 const duration=Math.max(0,Number(w.duration||0));
 const distance=Math.max(0,Number(w.distance||0));
 const elevation=Math.max(0,Number(w.elevation||0));
 const rpe=Number(w.rpe||0);
 const hr=Number(w.average_heartrate||0);
 const watts=Number(w.average_watts||0);
 const type=normalizedWorkoutType(w);
 const typeFactor={ruta:1,gravel:1.08,rodillo:.92,brevet:1.12,gimnasio:.72,kinesiologia:.30,kine:.30}[type]||1;
 const durationLoad=duration/60*32;
 const distanceLoad=distance*.20;
 const climbLoad=elevation/1000*14;
 const rpeFactor=rpe>0?Math.max(.65,Math.min(1.50,rpe/6)):1;
 const hrFactor=hr>0?Math.max(.85,Math.min(1.25,hr/140)):1;
 const powerFactor=watts>0?Math.max(.90,Math.min(1.25,watts/180)):1;
 return Math.max(0,(durationLoad+distanceLoad+climbLoad)*typeFactor*rpeFactor*hrFactor*powerFactor);
}
function dateRangeDays(days){
 const out=[],now=new Date();now.setHours(0,0,0,0);
 for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);out.push(dayKey(d))}
 return out;
}
function dailyLoads(days=120){
 const keys=dateRangeDays(days),map=Object.fromEntries(keys.map(k=>[k,0]));
 (typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[]).forEach(w=>{if(map[w.date]!==undefined)map[w.date]+=estimatedLoad(w)});
 return keys.map(date=>({date,load:map[date]}));
}
function ewma(values,days){
 const alpha=1/days;let value=0;
 return values.map(x=>{value=value+(x-value)*alpha;return value});
}
function performanceData(){
 const daily=dailyLoads(120);
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
  const list=(typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[]).filter(w=>{const d=parseLocalDate(w.date);return d>=start&&d<end});
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
 return {daily,loads,fitness,fatigue,form,current,weeks,current4,previous4,change};
}
function formLabel(v){
 if(v>8)return {text:'Fresco',cls:'balance-positive'};
 if(v>-8)return {text:'Equilibrado',cls:'balance-neutral'};
 return {text:'Fatiga acumulada',cls:'balance-negative'};
}
function performanceRecommendation(p){
 const latestCheckin=(state.checkins||[])[0]||null;
 const knee=Number(latestCheckin?.knee_pain||0);
 const sleep=Number(latestCheckin?.sleep_hours||0);
 if(knee>=5)return {title:'Prioriza recuperación',text:'El dolor de rodilla registrado es alto. Evita intensidad y sigue las indicaciones de tu kinesiólogo.',cls:'balance-negative'};
 if(sleep>0&&sleep<6)return {title:'Carga reducida',text:'Dormiste menos de 6 horas. Conviene una sesión corta y suave o descanso.',cls:'balance-neutral'};
 if(p.current.form<-10)return {title:'Descanso o Z1',text:'La fatiga reciente supera claramente al fitness. Prioriza recuperación.',cls:'balance-negative'};
 if(p.current.form>10)return {title:'Buen momento para calidad',text:'Tu balance es fresco. Si la rodilla está estable, puedes realizar la sesión prevista.',cls:'balance-positive'};
 return {title:'Mantén el plan',text:'Tu balance está estable. Prioriza trabajo aeróbico y progresión gradual.',cls:'balance-neutral'};
}
function svgPerformanceChart(p){
 const count=56,start=Math.max(0,p.fitness.length-count);
 const fit=p.fitness.slice(start),fat=p.fatigue.slice(start),form=p.form.slice(start);
 const all=[...fit,...fat,...form],min=Math.min(...all,0),max=Math.max(...all,1),range=Math.max(1,max-min);
 const points=arr=>arr.map((v,i)=>{
  const x=4+(i/Math.max(1,arr.length-1))*92;
  const y=94-((v-min)/range)*84;
  return `${x.toFixed(2)},${y.toFixed(2)}`
 }).join(' ');
 return `<svg class="performance-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Tendencia de fitness, fatiga y forma">
  <line x1="4" y1="94" x2="96" y2="94" class="chart-axis"/>
  <polyline points="${points(fit)}" class="chart-fit"/>
  <polyline points="${points(fat)}" class="chart-fatigue"/>
  <polyline points="${points(form)}" class="chart-form"/>
 </svg>`;
}
async function performanceModule(){
 await loadWorkouts(true).catch(()=>loadWorkouts());
 if(typeof loadCheckins==='function')await loadCheckins();
 const p=performanceData(),label=formLabel(p.current.form),rec=performanceRecommendation(p);
 const max=Math.max(...p.weeks.map(x=>x.load),1);
 const currentWeek=p.weeks.at(-1)||{load:0,km:0,hours:0};
 const typeTotals={};
 (typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[]).forEach(w=>{const type=normalizedWorkoutType(w);typeTotals[type]=(typeTotals[type]||0)+estimatedLoad(w)});
 const types=Object.entries(typeTotals).sort((a,b)=>b[1]-a[1]);
 view.innerHTML=`<div class="section-title"><h2>Performance Center</h2><span class="badge">V16.1</span></div>
 <section class="hero performance-hero"><div class="eyebrow">Estado actual</div><div class="performance-score ${label.cls}">${p.current.form.toFixed(0)}</div><h1>${label.text}</h1><p class="muted">Balance entre fitness de 42 días y fatiga de 7 días.</p></section>
 <div class="card recommendation-card"><div class="eyebrow">Recomendación de hoy</div><h2 class="${rec.cls}">${rec.title}</h2><p class="muted">${rec.text}</p></div>
 <div class="card"><div class="performance-grid">
  <div><b>${p.current.fitness.toFixed(0)}</b><span>FITNESS 42 DÍAS</span></div>
  <div><b>${p.current.fatigue.toFixed(0)}</b><span>FATIGA 7 DÍAS</span></div>
  <div><b class="${label.cls}">${p.current.form.toFixed(0)}</b><span>FORMA</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">Tendencia · 8 semanas</div>${svgPerformanceChart(p)}
  <div class="chart-legend"><span><i class="legend-fit"></i>Fitness</span><span><i class="legend-fatigue"></i>Fatiga</span><span><i class="legend-form"></i>Forma</span></div>
 </div>
 <div class="card"><div class="eyebrow">Semana actual</div><div class="performance-grid">
  <div><b>${currentWeek.load.toFixed(0)}</b><span>CARGA</span></div>
  <div><b>${currentWeek.km.toFixed(0)}</b><span>KM</span></div>
  <div><b>${currentWeek.hours.toFixed(1)}</b><span>HORAS</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">Carga · últimas 12 semanas</div><div class="load-chart">${p.weeks.map(w=>`<div><b class="tiny">${w.load.toFixed(0)}</b><i style="height:${Math.max(3,w.load/max*125)}px"></i><small>${w.label}</small></div>`).join('')}</div></div>
 <div class="card ${Math.abs(p.change)>35?'maintenance-alert':''}"><div class="bar"><span>Cambio últimas 4 semanas</span><b class="${p.change>35?'balance-negative':p.change<-30?'balance-neutral':'balance-positive'}">${p.change>=0?'+':''}${p.change.toFixed(0)}%</b></div><p class="muted">${p.change>35?'El aumento es elevado. Revisa fatiga, sueño y dolor antes de seguir aumentando volumen.':p.change<-30?'La carga bajó de forma importante; puede corresponder a recuperación o interrupción del plan.':'La progresión reciente se mantiene dentro de un rango moderado.'}</p></div>
 <div class="card"><div class="eyebrow">Distribución de carga</div>${types.length?types.map(([type,val])=>`<div class="bar"><span>${type}</span><b>${val.toFixed(0)}</b></div>`).join(''):'<p class="muted">Sin entrenamientos suficientes.</p>'}</div>
 <div class="card"><div class="eyebrow">Diagnóstico de datos</div><div class="bar"><span>Registros totales</span><b>${typeof dataQualityReport==='function'?dataQualityReport().total:(state.workouts||[]).length}</b></div><div class="bar"><span>Ciclismo utilizable</span><b>${typeof dataQualityReport==='function'?dataQualityReport().rideCount:'—'}</b></div><div class="bar"><span>Actividades Strava</span><b>${typeof dataQualityReport==='function'?dataQualityReport().stravaCount:'—'}</b></div></div>
 <div class="card disclaimer-box"><b>Cómo se calcula</b><p class="muted">Carga DOCH20 es una estimación basada en duración, distancia, desnivel, tipo de sesión, RPE, frecuencia cardíaca y potencia cuando están disponibles. No equivale a TSS, TRIMP ni a una evaluación médica.</p></div>`;
}
