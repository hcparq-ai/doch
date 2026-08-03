function workoutIcon(t){return ({ruta:'🚴',gravel:'🟤',rodillo:'🌀',brevet:'🏁',gimnasio:'🏋️',kinesiologia:'🦵'})[t]||'🚴'}
function durationLabel(min){min=Number(min)||0;const h=Math.floor(min/60),m=min%60;return h?`${h}h ${m}m`:`${m} min`}

function decodePolyline(str,precision=5){
 if(!str)return[];
 let index=0,lat=0,lng=0,coordinates=[],shift,result,byte;
 const factor=Math.pow(10,precision);
 while(index<str.length){
  shift=0;result=0;
  do{byte=str.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5}while(byte>=0x20);
  lat+=(result&1)?~(result>>1):(result>>1);
  shift=0;result=0;
  do{byte=str.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5}while(byte>=0x20);
  lng+=(result&1)?~(result>>1):(result>>1);
  coordinates.push([lat/factor,lng/factor]);
 }
 return coordinates;
}
function speedKmh(ms){return ms?Number(ms)*3.6:0}
function openWorkoutDetail(id){
 const x=(state.workouts||[]).find(w=>String(w.id)===String(id));
 if(!x)return;
 view.innerHTML=`<div class="back-row"><div class="section-title"><h2>Detalle de actividad</h2></div><button class="secondary" onclick="workouts()">Volver</button></div>
 <section class="hero activity-highlight"><div class="eyebrow ${x.source==='strava'?'source-strava':''}">${x.source==='strava'?'STRAVA':'DOCH20'}</div><h1>${x.activity_name||x.type}</h1><p class="muted">${x.date} · ${x.type}</p></section>
 <div class="activity-grid">
  <div class="activity-metric"><b>${Number(x.distance||0).toFixed(1)}</b><span>km</span></div>
  <div class="activity-metric"><b>${durationLabel(x.duration)}</b><span>duración</span></div>
  <div class="activity-metric"><b>${x.elevation||0}</b><span>m+</span></div>
  <div class="activity-metric"><b>${speedKmh(x.average_speed).toFixed(1)}</b><span>km/h media</span></div>
  <div class="activity-metric"><b>${speedKmh(x.max_speed).toFixed(1)}</b><span>km/h máxima</span></div>
  <div class="activity-metric"><b>${x.average_heartrate?Number(x.average_heartrate).toFixed(0):'—'}</b><span>FC media</span></div>
  <div class="activity-metric"><b>${x.average_watts?Number(x.average_watts).toFixed(0):'—'}</b><span>potencia media</span></div>
  <div class="activity-metric"><b>${x.average_cadence?Number(x.average_cadence).toFixed(0):'—'}</b><span>cadencia</span></div>
  <div class="activity-metric"><b>${x.calories?Number(x.calories).toFixed(0):'—'}</b><span>calorías</span></div>
  <div class="activity-metric"><b>${x.rpe??'—'}</b><span>RPE</span></div>
 </div>
 ${x.summary_polyline?'<div id="activityMap" class="activity-map"></div>':'<div class="card"><p class="muted">Esta actividad no contiene mapa disponible.</p></div>'}
 ${x.notes?`<div class="card"><div class="eyebrow">Notas</div><p>${x.notes}</p></div>`:''}
 ${x.strava_url?`<div class="card"><button class="primary" onclick="window.open('${x.strava_url}','_blank')">VER EN STRAVA</button></div>`:''}`;
 if(x.summary_polyline)setTimeout(()=>renderActivityMap(x.summary_polyline),50);
}
function renderActivityMap(polyline){
 if(!window.L)return;
 const pts=decodePolyline(polyline);
 if(!pts.length)return;
 const map=L.map('activityMap',{zoomControl:true,attributionControl:true});
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'© OpenStreetMap'
 }).addTo(map);
 const line=L.polyline(pts,{weight:4}).addTo(map);
 map.fitBounds(line.getBounds(),{padding:[18,18]});
}

async function workouts(){
 await loadWorkouts();
 const w=state.workouts||[];
 const km=w.reduce((s,x)=>s+(Number(x.distance)||0),0);
 const mins=w.reduce((s,x)=>s+(Number(x.duration)||0),0);
 view.innerHTML=`<div class="section-title"><h2>Diario de entrenamiento</h2><button class="secondary" onclick="newWorkout()">Nuevo</button></div>
 <div class="refresh-row"><button class="secondary" onclick="reloadDiary()">↻ RECARGAR DIARIO</button></div>
 ${state.workoutLoadError?`<div class="card diary-error"><b>Error al consultar Supabase</b><code>${state.workoutLoadError}</code></div>`:''}
 <div class="workout-summary"><div class="card"><div class="tiny">SESIONES</div><div class="metric">${w.length}</div></div><div class="card"><div class="tiny">KM</div><div class="metric">${km.toFixed(0)}</div></div><div class="card"><div class="tiny">HORAS</div><div class="metric">${(mins/60).toFixed(1)}</div></div></div>
 <div class="card workout-list">${w.length?w.map(x=>`<div class="item" onclick="openWorkoutDetail('${x.id}')"><div class="icon">${workoutIcon(x.type)}</div><div class="item-main"><div class="item-title">${x.type.charAt(0).toUpperCase()+x.type.slice(1)} · ${Number(x.distance||0).toFixed(1)} km</div><div class="item-meta">${x.date} · ${durationLabel(x.duration)} · ${x.elevation||0} m+</div><div class="item-meta">RPE ${x.rpe??'-'} · Rodilla ${x.knee_pain??'-'}/10</div>${x.notes?`<div class="item-meta">${x.notes}</div>`:''}</div><button class="secondary danger" onclick="event.stopPropagation();deleteWorkout('${x.id}')">×</button></div>`).join(''):'<p class="muted">Todavía no hay entrenamientos registrados.</p>'}</div>
 <button class="fab" onclick="newWorkout()">＋</button>`;
}
function newWorkout(){
 window.workoutType='ruta';
 view.innerHTML=`<div class="section-title"><h2>Nuevo entrenamiento</h2><button class="secondary" onclick="workouts()">Volver</button></div><div class="card">
 <div class="field"><label>Fecha</label><input id="wDate" type="date" value="${today()}"></div>
 <div class="field"><label>Tipo</label><div class="pill-row">${[['ruta','Ruta'],['gravel','Gravel'],['rodillo','Rodillo'],['brevet','Brevet'],['gimnasio','Gimnasio'],['kinesiologia','Kinesiología']].map((x,i)=>`<button class="pill ${i===0?'on':''}" onclick="selectWorkoutType('${x[0]}',this)">${x[1]}</button>`).join('')}</div></div>
 <div class="dual"><div class="field"><label>Distancia km</label><input id="wDistance" type="number" step="0.1" value="0"></div><div class="field"><label>Duración min</label><input id="wDuration" type="number" value="0"></div></div>
 <div class="dual"><div class="field"><label>Desnivel m+</label><input id="wElevation" type="number" value="0"></div><div class="field"><label>RPE 1–10</label><input id="wRpe" type="number" min="1" max="10" value="5"></div></div>
 <div class="field"><label>Dolor de rodilla 0–10</label><input id="wKnee" type="number" min="0" max="10" value="0"></div>
 <div class="field"><label>Notas</label><textarea id="wNotes" placeholder="Sensaciones, clima, nutrición, molestias..."></textarea></div>
 <button class="primary" onclick="saveWorkout()">GUARDAR ENTRENAMIENTO</button></div>`;
}
function selectWorkoutType(t,b){window.workoutType=t;document.querySelectorAll('.pill').forEach(x=>x.classList.remove('on'));b.classList.add('on')}
async function saveWorkout(){
 const row={date:wDate.value,type:window.workoutType,distance:Number(wDistance.value)||0,duration:Number(wDuration.value)||0,elevation:Number(wElevation.value)||0,rpe:Number(wRpe.value)||null,knee_pain:Number(wKnee.value)||0,notes:wNotes.value.trim()};
 state.workouts=state.workouts||[];
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('workouts').insert({...row,user_id:cloud.user.id}).select().single();
  if(error){alert(error.message);return}
  state.workouts.unshift(data);
 }else{
  state.workouts.unshift({...row,id:'local-'+Date.now(),created_at:new Date().toISOString()});
 }
 localStorage.setItem(STORE,JSON.stringify(state));
 toast(cloud.user?'Guardado y sincronizado':'Guardado en este dispositivo');
 workouts();
}
async function deleteWorkout(id){
 if(!confirm('¿Eliminar este entrenamiento?'))return;
 if(cloud.user&&cloud.client&&!String(id).startsWith('local-')){
  const {error}=await cloud.client.from('workouts').delete().eq('id',id);
  if(error){alert(error.message);return}
 }
 state.workouts=(state.workouts||[]).filter(x=>x.id!==id);
 localStorage.setItem(STORE,JSON.stringify(state));
 workouts();
}
