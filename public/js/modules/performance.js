
function formLabel(v){
 if(v>10)return {text:'Fresco',cls:'balance-positive'};
 if(v>-10)return {text:'Equilibrado',cls:'balance-neutral'};
 return {text:'Fatiga acumulada',cls:'balance-negative'};
}
function svgPerformanceChart(p){
 const count=56,start=Math.max(0,p.ctl.length-count);
 const fit=p.ctl.slice(start),fat=p.atl.slice(start),form=p.tsb.slice(start);
 const all=[...fit,...fat,...form],min=Math.min(...all,0),max=Math.max(...all,1),range=Math.max(1,max-min);
 const points=arr=>arr.map((v,i)=>{
  const x=4+(i/Math.max(1,arr.length-1))*92;
  const y=94-((v-min)/range)*84;
  return `${x.toFixed(2)},${y.toFixed(2)}`
 }).join(' ');
 return `<svg class="performance-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <line x1="4" y1="94" x2="96" y2="94" class="chart-axis"/>
  <polyline points="${points(fit)}" class="chart-fit"/>
  <polyline points="${points(fat)}" class="chart-fatigue"/>
  <polyline points="${points(form)}" class="chart-form"/>
 </svg>`;
}
function performanceRecommendation(){
 const p=performanceEngine();
 const checkin=(state.checkins||[])[0]||null;
 const knee=Number(checkin?.knee_pain||0);
 const sleep=Number(checkin?.sleep_hours||0);
 if(knee>=5)return {title:'Recuperación prioritaria',text:'El dolor de rodilla registrado es alto. Evita intensidad.',cls:'balance-negative'};
 if(sleep>0&&sleep<6)return {title:'Carga reducida',text:'Dormiste menos de seis horas. Conviene una sesión corta y suave.',cls:'balance-neutral'};
 if(p.current.tsb<-12)return {title:'Descanso recomendado',text:'La fatiga reciente supera claramente al fitness.',cls:'balance-negative'};
 if(p.current.tsb>10)return {title:'Buen momento para calidad',text:'Tu balance actual permite una sesión exigente controlada.',cls:'balance-positive'};
 return {title:'Mantén el plan',text:'Tu balance está estable. Prioriza trabajo aeróbico y progresión gradual.',cls:'balance-neutral'};
}
function performanceModule(){
 const p=performanceEngine(),label=formLabel(p.current.tsb),rec=performanceRecommendation();
 const max=Math.max(...p.weeks.map(x=>x.load),1);
 const currentWeek=p.weeks.at(-1)||{load:0,km:0,hours:0};
 view.innerHTML=`<div class="section-title"><h2>Performance Center</h2><span class="badge">V17</span></div>
 <section class="hero performance-hero"><div class="eyebrow">ESTADO ACTUAL</div><div class="performance-score ${label.cls}">${p.current.tsb.toFixed(0)}</div><h1>${label.text}</h1><p class="muted">TSB estimado: CTL de 42 días menos ATL de 7 días.</p></section>
 <div class="card recommendation-card"><div class="eyebrow">RECOMENDACIÓN</div><h2 class="${rec.cls}">${rec.title}</h2><p class="muted">${rec.text}</p></div>
 <div class="card"><div class="performance-grid">
  <div><b>${p.current.ctl.toFixed(0)}</b><span>CTL · FITNESS</span></div>
  <div><b>${p.current.atl.toFixed(0)}</b><span>ATL · FATIGA</span></div>
  <div><b class="${label.cls}">${p.current.tsb.toFixed(0)}</b><span>TSB · FORMA</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">TENDENCIA · 8 SEMANAS</div>${svgPerformanceChart(p)}
  <div class="chart-legend"><span><i class="legend-fit"></i>CTL</span><span><i class="legend-fatigue"></i>ATL</span><span><i class="legend-form"></i>TSB</span></div>
 </div>
 <div class="card"><div class="eyebrow">SEMANA ACTUAL</div><div class="performance-grid">
  <div><b>${currentWeek.load.toFixed(0)}</b><span>CARGA</span></div>
  <div><b>${currentWeek.km.toFixed(0)}</b><span>KM</span></div>
  <div><b>${currentWeek.hours.toFixed(1)}</b><span>HORAS</span></div>
 </div></div>
 <div class="card"><div class="eyebrow">CARGA · 12 SEMANAS</div><div class="load-chart">${p.weeks.map(w=>`<div><b class="tiny">${w.load.toFixed(0)}</b><i style="height:${Math.max(3,w.load/max*125)}px"></i><small>${w.label}</small></div>`).join('')}</div></div>
 <div class="card"><div class="bar"><span>Ramp rate semanal</span><b class="${p.rampRate>80?'balance-negative':p.rampRate>30?'balance-neutral':'balance-positive'}">${p.rampRate>=0?'+':''}${p.rampRate.toFixed(0)}</b></div>
 <div class="bar"><span>Recuperación estimada</span><b>${p.recoveryHours} h</b></div>
 <div class="bar"><span>Días activos en historial</span><b>${p.activeDays}</b></div></div>
 <div class="card"><div class="section-title"><h2>Simular sesión</h2></div>
  <div class="dual"><div class="field"><label>Duración min</label><input id="simDuration" type="number" value="120"></div><div class="field"><label>Distancia km</label><input id="simDistance" type="number" value="50"></div></div>
  <div class="dual"><div class="field"><label>Desnivel m+</label><input id="simElevation" type="number" value="400"></div><div class="field"><label>RPE 1–10</label><input id="simRpe" type="number" min="1" max="10" value="5"></div></div>
  <button class="primary" onclick="runPerformanceSimulation()">SIMULAR IMPACTO</button>
  <div id="simulationResult"></div>
 </div>
 <div class="card disclaimer-box"><p class="muted">CTL, ATL, TSB y recuperación son estimaciones internas. No equivalen a métricas oficiales de TrainingPeaks ni a una evaluación médica.</p></div>`;
}
function runPerformanceSimulation(){
 const result=simulateWorkoutImpact({
  duration:Number(simDuration.value)||0,
  distance:Number(simDistance.value)||0,
  elevation:Number(simElevation.value)||0,
  rpe:Number(simRpe.value)||5
 });
 simulationResult.innerHTML=`<div class="simulation-box"><div><b>${result.load.toFixed(0)}</b><span>Carga</span></div><div><b>${result.ctl.toFixed(0)}</b><span>CTL</span></div><div><b>${result.atl.toFixed(0)}</b><span>ATL</span></div><div><b>${result.tsb.toFixed(0)}</b><span>TSB</span></div></div>`;
}
