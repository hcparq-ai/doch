async function loadCheckins(){
 state.checkins=state.checkins||[];
 if(cloud.user&&cloud.client){
  try{
   const {data,error}=await cloud.client.from('daily_checkins').select('*').order('checkin_date',{ascending:false}).limit(60);
   if(error)throw error;
   state.checkins=data||[];
   localStorage.setItem(STORE,JSON.stringify(state));
  }catch(e){console.warn('checkins load failed',e)}
 }
 return state.checkins;
}
function readinessScore(c){
 if(!c)return 0;
 const sleep=Math.min(100,(Number(c.sleep_hours||0)/8)*100);
 const quality=(Number(c.sleep_quality||0)/5)*100;
 const fatigue=100-(Number(c.fatigue||0)*10);
 const knee=100-(Number(c.knee_pain||0)*10);
 const motivation=Number(c.motivation||0)*10;
 return Math.max(0,Math.min(100,Math.round(sleep*.28+quality*.18+fatigue*.22+knee*.20+motivation*.12)));
}
function readinessLabel(score){
 if(score>=75)return {text:'Buena disposición',cls:'readiness-good',note:'Puedes realizar la sesión prevista, manteniendo atención a la rodilla.'};
 if(score>=50)return {text:'Carga moderada',cls:'readiness-mid',note:'Prioriza Z1–Z2 y reduce intensidad si aumenta el dolor.'};
 return {text:'Recuperación prioritaria',cls:'readiness-low',note:'Considera descanso o una sesión muy suave. Dolor persistente requiere evaluación profesional.'};
}
async function recoveryModule(){
 await loadCheckins();
 const list=state.checkins||[],latest=list[0]||null,score=readinessScore(latest),label=readinessLabel(score);
 const last14=list.slice(0,14);
 const avgPain=last14.length?last14.reduce((s,x)=>s+Number(x.knee_pain||0),0)/last14.length:0;
 const avgSleep=last14.length?last14.reduce((s,x)=>s+Number(x.sleep_hours||0),0)/last14.length:0;
 view.innerHTML=`<div class="section-title"><h2>Recuperación</h2><button class="secondary" onclick="newCheckin()">Registrar hoy</button></div>
 ${latest?`<div class="card readiness-score ${label.cls}"><span>DISPOSICIÓN DE HOY</span><strong>${score}</strong><h2>${label.text}</h2><p class="recovery-note">${label.note}</p></div>`:'<div class="card"><p class="muted">Aún no hay registros diarios.</p></div>'}
 <div class="checkin-grid"><div class="card"><div class="tiny">SUEÑO 14 DÍAS</div><div class="dashboard-number">${avgSleep.toFixed(1)} h</div></div><div class="card"><div class="tiny">RODILLA 14 DÍAS</div><div class="dashboard-number">${avgPain.toFixed(1)}/10</div></div></div>
 <div class="card"><div class="eyebrow">Últimos registros</div>${last14.map(c=>{const s=readinessScore(c);return `<div class="trend-row"><span>${c.checkin_date}</span><div class="trend-bar"><i style="width:${s}%"></i></div><b>${s}</b></div>`}).join('')||'<p class="muted">Sin datos.</p>'}</div>
 <div class="card"><p class="muted">Puntuación orientativa: no diagnostica lesiones ni sustituye indicaciones médicas o de kinesiología.</p></div>`;
}
function newCheckin(){
 const current=(state.checkins||[]).find(x=>x.checkin_date===today())||{};
 view.innerHTML=`<div class="section-title"><h2>Registro diario</h2><button class="secondary" onclick="recoveryModule()">Volver</button></div><div class="card">
 <div class="field"><label>Fecha</label><input id="cDate" type="date" value="${current.checkin_date||today()}"></div>
 <div class="dual"><div class="field"><label>Horas de sueño</label><input id="cSleep" type="number" step="0.1" value="${current.sleep_hours??7.5}"></div><div class="field"><label>Calidad 1–5</label><input id="cQuality" type="number" min="1" max="5" value="${current.sleep_quality??4}"></div></div>
 <div class="dual"><div class="field"><label>Fatiga 1–10</label><input id="cFatigue" type="number" min="1" max="10" value="${current.fatigue??4}"></div><div class="field"><label>Dolor rodilla 0–10</label><input id="cKnee" type="number" min="0" max="10" value="${current.knee_pain??0}"></div></div>
 <div class="dual"><div class="field"><label>Motivación 1–10</label><input id="cMotivation" type="number" min="1" max="10" value="${current.motivation??8}"></div><div class="field"><label>FC reposo</label><input id="cHr" type="number" value="${current.resting_hr??''}"></div></div>
 <div class="field"><label>Peso kg</label><input id="cWeight" type="number" step="0.1" value="${current.weight??80}"></div>
 <div class="field"><label>Notas</label><textarea id="cNotes">${current.notes||''}</textarea></div>
 <button class="primary" onclick="saveCheckin()">GUARDAR REGISTRO</button></div>`;
}
async function saveCheckin(){
 const row={checkin_date:cDate.value,sleep_hours:Number(cSleep.value)||0,sleep_quality:Number(cQuality.value)||1,fatigue:Number(cFatigue.value)||1,knee_pain:Number(cKnee.value)||0,motivation:Number(cMotivation.value)||1,resting_hr:cHr.value?Number(cHr.value):null,weight:cWeight.value?Number(cWeight.value):null,notes:cNotes.value.trim()};
 state.checkins=state.checkins||[];
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('daily_checkins').upsert({...row,user_id:cloud.user.id},{onConflict:'user_id,checkin_date'}).select().single();
  if(error){alert(error.message);return}
  state.checkins=state.checkins.filter(x=>x.checkin_date!==row.checkin_date);state.checkins.unshift(data);
 }else{
  state.checkins=state.checkins.filter(x=>x.checkin_date!==row.checkin_date);state.checkins.unshift({...row,id:'local-'+Date.now()});
 }
 localStorage.setItem(STORE,JSON.stringify(state));toast(cloud.user?'Registro sincronizado':'Registro guardado');recoveryModule();
}


