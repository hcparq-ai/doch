const $=s=>document.querySelector(s),STORE='doch20-v6-state';
let state=JSON.parse(localStorage.getItem(STORE)||'{"logs":{},"knee":[],"nutrition":{"carbs":80,"water":600,"sodium":500,"caffeine":300,"hours":10,"selectedFoods":{}},"bikeKm":8420,"weights":[{"date":"2026-07-29","kg":80}],"profile":{"name":"Héctor Contreras","age":37,"height":175,"weight":80,"diet":"Vegana","goal":"Brevet 1.000 km","goalDate":"2026-10-09"},"selectedDate":null,"workouts":[]}');
let plan=[],foods=[],bikes=[],currentMonth=new Date(2026,7,1);
let cloud={configured:false,client:null,user:null,saving:false,timer:null};
const view=$('#view'),icons={bike:'🚴',gym:'🏋️',kine:'🦵',rest:'◌',brevet:'🏁'},save=()=>{localStorage.setItem(STORE,JSON.stringify(state));scheduleCloudSave()},key=x=>`${x.date}|${x.time}|${x.title}`,today=()=>new Date().toISOString().slice(0,10);
const realKm=()=>Object.values(state.logs).reduce((s,x)=>s+(+x.realKm||0),0),done=()=>Object.values(state.logs).filter(x=>x.status==='done').length,next=()=>plan.find(x=>x.date>=today())||plan[0],iso=d=>d.toISOString().slice(0,10);
function item(x){const l=state.logs[key(x)]||{};return `<div class="item"><div class="icon">${icons[x.type]||'•'}</div><div class="item-main"><div class="item-title">${x.title}</div><div class="item-meta">${x.date} · ${x.time}–${x.end}${x.km?` · ${x.km} km`:''}${x.zone?` · ${x.zone}`:''}</div>${x.route?`<div class="item-meta">${x.route}</div>`:''}</div><span class="badge">${l.status==='done'?'HECHO':x.type.toUpperCase()}</span></div>`}

function toast(msg){
 const el=document.createElement('div');
 el.className='toast';
 el.textContent=msg;
 document.body.appendChild(el);
 setTimeout(()=>el.remove(),2200);
}

async function loadWorkouts(force=false){
 state.workouts=state.workouts||[];
 state.workoutLoadError='';
 if(!cloud.user||!cloud.client)return state.workouts;
 try{
  const {data,error}=await cloud.client
   .from('workouts')
   .select('*')
   .order('date',{ascending:false})
   .order('created_at',{ascending:false});
  if(error)throw error;
  state.workouts=Array.isArray(data)?data:[];
  localStorage.setItem(STORE,JSON.stringify(state));
  return state.workouts;
 }catch(e){
  console.error('loadWorkouts failed',e);
  state.workoutLoadError=e?.message||String(e);
  if(force)throw e;
  return state.workouts||[];
 }
}
async function reloadDiary(){
 try{
  await loadWorkouts(true);
  toast(`${state.workouts.length} entrenamientos cargados`);
  workouts();
 }catch(e){
  alert(`No se pudo cargar el Diario: ${e.message||e}`);
  workouts();
 }
}

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


const VEGAN_FOODS=[
 {name:'Plátano',carbs:27,sodium:1,caffeine:0,unit:'unidad'},
 {name:'Gel sin cafeína',carbs:25,sodium:100,caffeine:0,unit:'gel'},
 {name:'Gel con cafeína',carbs:25,sodium:100,caffeine:50,unit:'gel'},
 {name:'Barra energética vegana',carbs:35,sodium:120,caffeine:0,unit:'barra'},
 {name:'Sándwich mantequilla de maní',carbs:45,sodium:250,caffeine:0,unit:'sándwich'},
 {name:'Arroz compacto vegano',carbs:50,sodium:300,caffeine:0,unit:'porción'},
 {name:'Bebida isotónica 500 ml',carbs:30,sodium:400,caffeine:0,unit:'botella'},
 {name:'Coca-Cola 330 ml',carbs:35,sodium:15,caffeine:32,unit:'lata'}
];

async function loadNutritionLogs(){
 state.nutritionLogs=state.nutritionLogs||[];
 if(cloud.user&&cloud.client){
  try{
   const {data,error}=await cloud.client.from('nutrition_logs').select('*').order('date',{ascending:false}).order('created_at',{ascending:false});
   if(error)throw error;
   state.nutritionLogs=data||[];
   localStorage.setItem(STORE,JSON.stringify(state));
  }catch(e){console.warn('nutrition load failed',e)}
 }
 return state.nutritionLogs;
}

function nutritionTotalsFromForm(){
 const h=Number(nHours?.value)||0,c=Number(nCarbs?.value)||0,w=Number(nWater?.value)||0,s=Number(nSodium?.value)||0,f=Number(nCaffeine?.value)||0;
 return {carbs:h*c,water:h*w,sodium:h*s,caffeine:f};
}

function renderNutritionPreview(){
 const t=nutritionTotalsFromForm(),el=document.getElementById('nutritionPreview');
 if(!el)return;
 el.innerHTML=`<div class="card nutrition-total"><div class="tiny">CARBOS</div><div class="metric">${t.carbs.toFixed(0)} g</div></div><div class="card nutrition-total"><div class="tiny">AGUA</div><div class="metric">${(t.water/1000).toFixed(1)} L</div></div><div class="card nutrition-total"><div class="tiny">SODIO</div><div class="metric">${t.sodium.toFixed(0)} mg</div></div><div class="card nutrition-total"><div class="tiny">CAFEÍNA</div><div class="metric">${t.caffeine.toFixed(0)} mg</div></div>`;
}

function selectedFoodPlan(){
 return VEGAN_FOODS.map((f,i)=>({...f,qty:Number(document.getElementById('foodQty'+i)?.value)||0})).filter(x=>x.qty>0);
}

async function nutritionModule(){
 await loadNutritionLogs();
 const logs=state.nutritionLogs||[];
 view.innerHTML=`<div class="section-title"><h2>Nutrición</h2><button class="secondary" onclick="newNutritionPlan()">Nuevo plan</button></div><div class="card">${logs.length?logs.map(x=>`<div class="item"><div class="icon">🍌</div><div class="item-main"><div class="item-title">${x.title}</div><div class="item-meta">${x.date} · ${x.duration_hours} h · ${x.carbs_per_hour} g CHO/h</div><div class="item-meta">Plan: ${(x.duration_hours*x.carbs_per_hour).toFixed(0)} g CHO · ${(x.duration_hours*x.water_per_hour/1000).toFixed(1)} L</div></div><button class="secondary danger" onclick="deleteNutrition('${x.id}')">×</button></div>`).join(''):'<p class="muted">Todavía no hay planes nutricionales.</p>'}</div>`;
}

function newNutritionPlan(){
 view.innerHTML=`<div class="section-title"><h2>Nuevo plan nutricional</h2><button class="secondary" onclick="nutritionModule()">Volver</button></div><div class="card"><div class="field"><label>Fecha</label><input id="nDate" type="date" value="${today()}"></div><div class="field"><label>Título</label><input id="nTitle" value="Fondo / brevet"></div><div class="dual"><div class="field"><label>Duración estimada h</label><input id="nHours" type="number" step="0.5" value="10" oninput="renderNutritionPreview()"></div><div class="field"><label>Carbos g/h</label><input id="nCarbs" type="number" value="80" oninput="renderNutritionPreview()"></div></div><div class="dual"><div class="field"><label>Agua ml/h</label><input id="nWater" type="number" value="600" oninput="renderNutritionPreview()"></div><div class="field"><label>Sodio mg/h</label><input id="nSodium" type="number" value="500" oninput="renderNutritionPreview()"></div></div><div class="field"><label>Cafeína total máxima mg</label><input id="nCaffeine" type="number" value="250" oninput="renderNutritionPreview()"></div></div><div id="nutritionPreview" class="nutrition-grid"></div><div class="section-title"><h2>Alimentos veganos</h2></div><div class="card food-picker">${VEGAN_FOODS.map((f,i)=>`<div class="food-line"><div><b>${f.name}</b><div class="tiny">${f.carbs} g CHO · ${f.sodium} mg Na · ${f.caffeine} mg cafeína / ${f.unit}</div></div><input id="foodQty${i}" type="number" min="0" value="0"></div>`).join('')}</div><div class="card"><div class="field"><label>Notas</label><textarea id="nNotes"></textarea></div><button class="primary" onclick="saveNutritionPlan()">GUARDAR PLAN</button></div>`;
 renderNutritionPreview();
}

async function saveNutritionPlan(){
 const row={date:nDate.value,title:nTitle.value.trim()||'Plan nutricional',duration_hours:Number(nHours.value)||1,carbs_per_hour:Number(nCarbs.value)||0,water_per_hour:Number(nWater.value)||0,sodium_per_hour:Number(nSodium.value)||0,caffeine_total:Number(nCaffeine.value)||0,planned_foods:selectedFoodPlan(),actual_carbs:0,actual_water:0,actual_sodium:0,actual_caffeine:0,notes:nNotes.value.trim()};
 state.nutritionLogs=state.nutritionLogs||[];
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('nutrition_logs').insert({...row,user_id:cloud.user.id}).select().single();
  if(error){alert(error.message);return}
  state.nutritionLogs.unshift(data);
 }else{
  state.nutritionLogs.unshift({...row,id:'local-nutri-'+Date.now(),created_at:new Date().toISOString()});
 }
 localStorage.setItem(STORE,JSON.stringify(state));
 toast(cloud.user?'Plan nutricional sincronizado':'Plan guardado localmente');
 nutritionModule();
}

async function deleteNutrition(id){
 if(!confirm('¿Eliminar este plan nutricional?'))return;
 if(cloud.user&&cloud.client&&!String(id).startsWith('local-')){
  const {error}=await cloud.client.from('nutrition_logs').delete().eq('id',id);
  if(error){alert(error.message);return}
 }
 state.nutritionLogs=(state.nutritionLogs||[]).filter(x=>x.id!==id);
 localStorage.setItem(STORE,JSON.stringify(state));
 nutritionModule();
}


async function loadBrevets(){
 state.brevets=state.brevets||[];
 if(cloud.user&&cloud.client){
  try{
   const {data,error}=await cloud.client.from('brevets').select('*').order('event_date',{ascending:false});
   if(error)throw error;
   state.brevets=data||[];
   localStorage.setItem(STORE,JSON.stringify(state));
  }catch(e){console.warn('brevets load failed',e)}
 }
 return state.brevets;
}

async function brevetsModule(){
 await loadBrevets();
 const list=state.brevets||[];
 view.innerHTML=`<div class="section-title"><h2>Brevets</h2><button class="secondary" onclick="newBrevet()">Nuevo</button></div>
 <div class="card">${list.length?list.map(b=>`<div class="item" onclick="openBrevet('${b.id}')">
  <div class="icon">🏁</div>
  <div class="item-main"><div class="item-title">${b.title}</div><div class="item-meta">${b.event_date} · ${b.total_distance} km · objetivo ${b.target_hours} h</div><div class="item-meta">Estado: ${b.status}</div></div>
 </div>`).join(''):'<p class="muted">Todavía no hay brevets creados.</p>'}</div>`;
}

function newBrevet(){
 view.innerHTML=`<div class="section-title"><h2>Nuevo brevet</h2><button class="secondary" onclick="brevetsModule()">Volver</button></div>
 <div class="card">
  <div class="field"><label>Nombre</label><input id="bTitle" value="Brevet 1000 km"></div>
  <div class="field"><label>Fecha</label><input id="bDate" type="date" value="${today()}"></div>
  <div class="dual">
   <div class="field"><label>Distancia total km</label><input id="bDistance" type="number" value="1000"></div>
   <div class="field"><label>Tiempo objetivo h</label><input id="bHours" type="number" step="0.5" value="68"></div>
  </div>
  <div class="field"><label>Controles, uno por línea</label><textarea id="bControls" placeholder="125, Control 1&#10;250, Control 2&#10;500, Control 3"></textarea></div>
  <div class="field"><label>Notas</label><textarea id="bNotes"></textarea></div>
  <button class="primary" onclick="saveBrevet()">GUARDAR BREVET</button>
 </div>`;
}

function parseControls(){
 return bControls.value.split('\n').map(x=>x.trim()).filter(Boolean).map((line,i)=>{
  const [km,...name]=line.split(',');
  return {km:Number(km)||0,name:name.join(',').trim()||`Control ${i+1}`};
 }).sort((a,b)=>a.km-b.km);
}

async function saveBrevet(){
 const row={title:bTitle.value.trim()||'Brevet',event_date:bDate.value,total_distance:Number(bDistance.value)||0,target_hours:Number(bHours.value)||0,controls:parseControls(),status:'planned',current_km:0,elapsed_minutes:0,stopped_minutes:0,carbs_consumed:0,water_consumed:0,sodium_consumed:0,caffeine_consumed:0,notes:bNotes.value.trim()};
 state.brevets=state.brevets||[];
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('brevets').insert({...row,user_id:cloud.user.id}).select().single();
  if(error){alert(error.message);return}
  state.brevets.unshift(data);
 }else{
  state.brevets.unshift({...row,id:'local-brevet-'+Date.now(),created_at:new Date().toISOString()});
 }
 localStorage.setItem(STORE,JSON.stringify(state));
 toast(cloud.user?'Brevet sincronizado':'Brevet guardado localmente');
 brevetsModule();
}

function findBrevet(id){return (state.brevets||[]).find(x=>String(x.id)===String(id))}

function openBrevet(id){
 const b=findBrevet(id); if(!b)return;
 if(b.status==='active') return liveBrevet(id);
 const controls=b.controls||[];
 view.innerHTML=`<div class="section-title"><h2>${b.title}</h2><button class="secondary" onclick="brevetsModule()">Volver</button></div>
 <section class="hero"><div class="eyebrow">${b.event_date}</div><h1>${b.total_distance} km</h1><p class="muted">Objetivo ${b.target_hours} h · promedio ${(b.total_distance/b.target_hours).toFixed(1)} km/h</p></section>
 <div class="card control-list">${controls.length?controls.map(c=>`<div class="bar"><span>${c.name}</span><b>${c.km} km</b></div>`).join(''):'<p class="muted">Sin controles configurados.</p>'}</div>
 <button class="primary" onclick="startBrevet('${b.id}')">INICIAR BREVET</button>`;
}

async function startBrevet(id){
 const b=findBrevet(id); if(!b)return;
 b.status='active'; b.started_at=new Date().toISOString();
 await persistBrevet(b);
 liveBrevet(id);
}

async function persistBrevet(b){
 localStorage.setItem(STORE,JSON.stringify(state));
 if(cloud.user&&cloud.client&&!String(b.id).startsWith('local-')){
  const payload={status:b.status,started_at:b.started_at,finished_at:b.finished_at,current_km:b.current_km,elapsed_minutes:b.elapsed_minutes,stopped_minutes:b.stopped_minutes,carbs_consumed:b.carbs_consumed,water_consumed:b.water_consumed,sodium_consumed:b.sodium_consumed,caffeine_consumed:b.caffeine_consumed};
  const {error}=await cloud.client.from('brevets').update(payload).eq('id',b.id);
  if(error)console.warn(error);
 }
}

function liveBrevet(id){
 const b=findBrevet(id); if(!b)return;
 const remaining=Math.max(0,Number(b.total_distance)-Number(b.current_km||0));
 const elapsedH=(Number(b.elapsed_minutes||0)/60);
 const avg=elapsedH>0?Number(b.current_km||0)/elapsedH:0;
 const targetAvg=Number(b.total_distance)/Number(b.target_hours);
 const next=(b.controls||[]).find(c=>Number(c.km)>Number(b.current_km||0));
 view.innerHTML=`<div class="brevet-live">
 <div class="eyebrow green">Brevet en progreso</div><h2>${b.title}</h2>
 <div class="km yellow">${Number(b.current_km||0).toFixed(0)}</div><div class="remaining">${remaining.toFixed(0)} km restantes</div>
 <div class="grid"><div class="card"><div class="tiny">TIEMPO</div><div class="metric">${Math.floor((b.elapsed_minutes||0)/60)}h ${(b.elapsed_minutes||0)%60}m</div></div><div class="card"><div class="tiny">PROMEDIO</div><div class="metric">${avg.toFixed(1)}</div></div></div>
 <div class="card"><div class="bar"><span>Promedio objetivo</span><b>${targetAvg.toFixed(1)} km/h</b></div><div class="bar"><span>Próximo control</span><b>${next?`${next.name} · ${(next.km-b.current_km).toFixed(0)} km`:'Meta'}</b></div><div class="bar"><span>Carbohidratos</span><b>${b.carbs_consumed||0} g</b></div><div class="bar"><span>Agua</span><b>${((b.water_consumed||0)/1000).toFixed(1)} L</b></div><div class="bar"><span>Cafeína</span><b>${b.caffeine_consumed||0} mg</b></div></div>
 <div class="brevet-actions">
  <button onclick="updateBrevetValue('${b.id}','km')">+ KM</button>
  <button onclick="updateBrevetValue('${b.id}','time')">+ TIEMPO</button>
  <button onclick="updateBrevetValue('${b.id}','food')">+ COMIDA</button>
  <button onclick="updateBrevetValue('${b.id}','water')">+ AGUA</button>
  <button onclick="updateBrevetValue('${b.id}','caffeine')">+ CAFEÍNA</button>
  <button onclick="finishBrevet('${b.id}')">FINALIZAR</button>
 </div></div>`;
}

async function updateBrevetValue(id,type){
 const b=findBrevet(id); if(!b)return;
 let v;
 if(type==='km'){v=Number(prompt('Kilómetros actuales',b.current_km||0));if(!Number.isFinite(v))return;b.current_km=v}
 if(type==='time'){v=Number(prompt('Minutos transcurridos',b.elapsed_minutes||0));if(!Number.isFinite(v))return;b.elapsed_minutes=v}
 if(type==='food'){v=Number(prompt('Agregar carbohidratos (g)',25));if(!Number.isFinite(v))return;b.carbs_consumed=Number(b.carbs_consumed||0)+v}
 if(type==='water'){v=Number(prompt('Agregar agua (ml)',500));if(!Number.isFinite(v))return;b.water_consumed=Number(b.water_consumed||0)+v}
 if(type==='caffeine'){v=Number(prompt('Agregar cafeína (mg)',50));if(!Number.isFinite(v))return;b.caffeine_consumed=Number(b.caffeine_consumed||0)+v}
 await persistBrevet(b); liveBrevet(id);
}

async function finishBrevet(id){
 if(!confirm('¿Finalizar este brevet?'))return;
 const b=findBrevet(id); if(!b)return;
 b.status='finished'; b.finished_at=new Date().toISOString();
 await persistBrevet(b); brevetsModule();
}


async function getAccessToken(){
 if(!cloud.client)return null;
 const {data}=await cloud.client.auth.getSession();
 return data.session?.access_token||null;
}
async function stravaRequest(path,options={}){
 const token=await getAccessToken();
 if(!token)throw new Error('Inicia sesión primero');
 const r=await fetch(path,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||'Error de Strava');
 return data;
}
async function connectStrava(){
 try{
  const data=await stravaRequest('/api/strava/start',{method:'POST'});
  location.href=data.url;
 }catch(e){alert(e.message)}
}
async function syncStrava(){
 try{
  toast('Sincronizando Strava...');
  const data=await stravaRequest('/api/strava/sync',{method:'POST'});
  await loadWorkouts(true);
  toast(`${data.imported} actividades sincronizadas`);
  stravaModule();
 }catch(e){alert(e.message)}
}
async function disconnectStrava(){
 if(!confirm('¿Desconectar Strava?'))return;
 try{
  await stravaRequest('/api/strava/disconnect',{method:'POST'});
  toast('Strava desconectado');
  stravaModule();
 }catch(e){alert(e.message)}
}
async function stravaModule(){
 if(!cloud.user){
  view.innerHTML=`<div class="section-title"><h2>Strava</h2></div><div class="card"><p>Inicia sesión en DOCH20 para conectar Strava.</p><button class="primary" onclick="account()">IR A CUENTA</button></div>`;
  return;
 }
 let status={connected:false};
 try{status=await stravaRequest('/api/strava/status')}catch(e){}
 view.innerHTML=`<div class="section-title"><h2>Strava</h2><button class="secondary" onclick="more()">Volver</button></div>
 <section class="hero strava-card"><div class="strava-mark">STRAVA</div><h1>${status.connected?'Cuenta conectada':'Conecta tus actividades'}</h1><p class="muted">${status.connected?(status.athleteName||'Atleta autorizado'):'Importa distancia, tiempo, desnivel, frecuencia cardíaca y potencia.'}</p></section>
 <div class="card strava-actions">${status.connected?`<button class="primary" onclick="syncStrava()">SINCRONIZAR AHORA</button><button class="secondary danger" onclick="disconnectStrava()">DESCONECTAR</button>`:`<button class="primary" onclick="connectStrava()">CONECTAR CON STRAVA</button>`}</div>`;
}


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

function dayKey(d){return d.toISOString().slice(0,10)}
function roadStats(){
 const all=state.workouts||[];
 const rides=all.filter(x=>['ruta','gravel','rodillo','brevet'].includes(x.type));
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
 <section class="hero"><div class="eyebrow">Volumen acumulado</div><h1>${s.total.toFixed(0)} km</h1><p class="muted">Salida más larga: ${longest.toFixed(0)} km · ${s.activeDays} días activos</p><div class="progress"><i style="width:${Math.min(100,s.total/1200*100)}%"></i></div></section>
 <div class="card"><div class="eyebrow">Escalera brevet</div>${stages.map(k=>{const pct=Math.min(100,longest/k*100);return `<div class="road-stage ${longest>=k?'done':''}"><div class="stage-km">${k} km</div><div class="progress"><i style="width:${pct}%"></i></div><div>${longest>=k?'✓':Math.round(pct)+'%'}</div></div>`}).join('')}</div>
 <div class="card"><div class="eyebrow">Estado reciente</div><div class="road-kpi"><div><b>${recent.toFixed(0)}</b><span>km / 4 semanas</span></div><div><b>${readiness}%</b><span>volumen objetivo</span></div><div><b>${s.streak}</b><span>racha actual</span></div></div></div>
 <div class="card"><div class="eyebrow">Carga diaria · 14 semanas</div><div class="heatmap">${s.heat.map(x=>`<i class="heat-day ${heatClass(x.km)}" title="${x.date}: ${x.km.toFixed(0)} km"></i>`).join('')}</div><div class="heat-legend"><span class="tiny">Menos</span><i class="heat-day l1"></i><i class="heat-day l2"></i><i class="heat-day l3"></i><i class="heat-day l4"></i><span class="tiny">Más</span></div></div>
 <div class="card"><div class="eyebrow">Últimas 12 semanas</div><div class="volume-bars">${s.weeks.map(x=>`<div><b class="tiny">${x.km.toFixed(0)}</b><i style="height:${Math.max(3,x.km/maxWeek*110)}px"></i><small>${x.label}</small></div>`).join('')}</div></div>
 <div class="card"><div class="bar"><span>Próximo objetivo</span><b>${longest<200?'200 km':longest<300?'300 km':longest<400?'400 km':longest<600?'600 km':longest<1000?'1.000 km':'PBP 1.200 km'}</b></div><div class="bar"><span>Mayor distancia registrada</span><b>${longest.toFixed(1)} km</b></div><div class="bar"><span>Diagnóstico</span><b class="${readiness>=75?'status-good':'status-warn'}">${readiness>=75?'Volumen sólido':'Seguir acumulando base'}</b></div></div>`;
}


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


async function loadBikeData(){
 state.bikes=state.bikes||[];state.components=state.components||[];state.maintenance=state.maintenance||[];
 if(cloud.user&&cloud.client){
  try{
   const [b,c,m]=await Promise.all([
    cloud.client.from('bikes').select('*').order('created_at',{ascending:true}),
    cloud.client.from('bike_components').select('*').order('created_at',{ascending:true}),
    cloud.client.from('maintenance_logs').select('*').order('service_date',{ascending:false})
   ]);
   if(b.error)throw b.error;if(c.error)throw c.error;if(m.error)throw m.error;
   state.bikes=b.data||[];state.components=c.data||[];state.maintenance=m.data||[];
   localStorage.setItem(STORE,JSON.stringify(state));
  }catch(e){console.warn('bike data failed',e)}
 }
}
function bikeMileage(bike){
 const linked=(state.workouts||[]).filter(w=>String(w.bike_id||'')===String(bike.id));
 const logged=linked.reduce((s,w)=>s+(Number(w.distance)||0),0);
 return Math.max(Number(bike.odometer_km||0),logged);
}
function componentProgress(c,bike){
 const km=bikeMileage(bike);
 const since=Math.max(0,km-Number(c.installed_km||0));
 const limit=Number(c.replacement_interval_km||c.service_interval_km||0);
 const pct=limit?Math.min(100,since/limit*100):0;
 return {km,since,limit,pct,due:limit>0&&since>=limit};
}
async function bikesModule(){
 await loadBikeData();
 const bikes=state.bikes||[];
 view.innerHTML=`<div class="section-title"><h2>Bicicletas</h2><button class="secondary" onclick="newBike()">Nueva</button></div>
 ${bikes.length?bikes.map(b=>{const comps=(state.components||[]).filter(c=>c.bike_id===b.id);const due=comps.filter(c=>componentProgress(c,b).due).length;return `<div class="card bike-card" onclick="openBike('${b.id}')"><div class="eyebrow">${b.bike_type}</div><h2>${b.name}</h2><p class="muted">${[b.brand,b.model].filter(Boolean).join(' ')}</p><div class="bike-km">${bikeMileage(b).toFixed(0)} km</div><div class="bar"><span>Componentes</span><b>${comps.length}</b></div><div class="bar"><span>Mantenimientos pendientes</span><b class="${due?'status-warn':'status-good'}">${due}</b></div></div>`}).join(''):'<div class="card"><p class="muted">Todavía no hay bicicletas registradas.</p></div>'}`;
}
function newBike(){
 view.innerHTML=`<div class="section-title"><h2>Nueva bicicleta</h2><button class="secondary" onclick="bikesModule()">Volver</button></div><div class="card">
 <div class="field"><label>Nombre</label><input id="bikeName" value="Scott Speedster 50"></div>
 <div class="dual"><div class="field"><label>Marca</label><input id="bikeBrand" value="Scott"></div><div class="field"><label>Modelo</label><input id="bikeModel" value="Speedster 50"></div></div>
 <div class="field"><label>Tipo</label><select id="bikeType"><option value="gravel">Gravel</option><option value="ruta">Ruta</option><option value="mtb">MTB</option><option value="urbana">Urbana</option></select></div>
 <div class="field"><label>Kilometraje actual</label><input id="bikeOdo" type="number" value="0"></div>
 <div class="field"><label>Notas</label><textarea id="bikeNotes"></textarea></div>
 <button class="primary" onclick="saveBike()">GUARDAR BICICLETA</button></div>`;
}
async function saveBike(){
 const row={name:bikeName.value.trim(),brand:bikeBrand.value.trim(),model:bikeModel.value.trim(),bike_type:bikeType.value,odometer_km:Number(bikeOdo.value)||0,notes:bikeNotes.value.trim()};
 if(!row.name)return alert('Escribe un nombre');
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('bikes').insert({...row,user_id:cloud.user.id}).select().single();
  if(error)return alert(error.message);state.bikes.push(data);
 }else state.bikes.push({...row,id:'local-bike-'+Date.now()});
 localStorage.setItem(STORE,JSON.stringify(state));toast('Bicicleta guardada');bikesModule();
}
function openBike(id){
 const b=(state.bikes||[]).find(x=>String(x.id)===String(id));if(!b)return;
 const comps=(state.components||[]).filter(c=>String(c.bike_id)===String(id));
 view.innerHTML=`<div class="section-title"><h2>${b.name}</h2><button class="secondary" onclick="bikesModule()">Volver</button></div>
 <section class="hero"><div class="eyebrow">${b.bike_type}</div><h1>${bikeMileage(b).toFixed(0)} km</h1><p class="muted">${[b.brand,b.model].filter(Boolean).join(' ')}</p></section>
 <div class="card"><div class="section-title"><h2>Componentes</h2><button class="secondary" onclick="newComponent('${b.id}')">Agregar</button></div>${comps.length?comps.map(c=>{const p=componentProgress(c,b);return `<div class="component-row"><div><b>${c.component_type}</b><div class="tiny">${c.component_name||''}</div><div class="progress"><i style="width:${p.pct}%"></i></div><div class="tiny">${p.since.toFixed(0)} / ${p.limit||'—'} km</div></div><div class="component-status ${p.due?'status-warn':'status-good'}">${p.due?'REVISAR':'OK'}</div></div>`}).join(''):'<p class="muted">Sin componentes registrados.</p>'}</div>
 <div class="card"><button class="primary" onclick="newMaintenance('${b.id}')">REGISTRAR MANTENIMIENTO</button></div>`;
}
function newComponent(bikeId){
 view.innerHTML=`<div class="section-title"><h2>Nuevo componente</h2><button class="secondary" onclick="openBike('${bikeId}')">Volver</button></div><div class="card">
 <div class="field"><label>Tipo</label><select id="compType"><option>Cadena</option><option>Neumático delantero</option><option>Neumático trasero</option><option>Pastillas de freno</option><option>Discos</option><option>Cassette</option><option>Platos</option><option>Rodamientos</option><option>Cables</option><option>Otro</option></select></div>
 <div class="field"><label>Nombre / modelo</label><input id="compName"></div>
 <div class="dual"><div class="field"><label>Km al instalar</label><input id="compInstalledKm" type="number" value="0"></div><div class="field"><label>Reemplazo cada km</label><input id="compReplace" type="number" value="3000"></div></div>
 <div class="field"><label>Notas</label><textarea id="compNotes"></textarea></div>
 <button class="primary" onclick="saveComponent('${bikeId}')">GUARDAR COMPONENTE</button></div>`;
}
async function saveComponent(bikeId){
 const row={bike_id:bikeId,component_type:compType.value,component_name:compName.value.trim(),installed_km:Number(compInstalledKm.value)||0,replacement_interval_km:Number(compReplace.value)||0,service_interval_km:0,last_service_km:Number(compInstalledKm.value)||0,notes:compNotes.value.trim()};
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('bike_components').insert({...row,user_id:cloud.user.id}).select().single();
  if(error)return alert(error.message);state.components.push(data);
 }else state.components.push({...row,id:'local-comp-'+Date.now()});
 localStorage.setItem(STORE,JSON.stringify(state));toast('Componente guardado');openBike(bikeId);
}
function newMaintenance(bikeId){
 const comps=(state.components||[]).filter(c=>String(c.bike_id)===String(bikeId));
 view.innerHTML=`<div class="section-title"><h2>Mantenimiento</h2><button class="secondary" onclick="openBike('${bikeId}')">Volver</button></div><div class="card">
 <div class="field"><label>Fecha</label><input id="mDate" type="date" value="${today()}"></div>
 <div class="field"><label>Componente</label><select id="mComponent"><option value="">General</option>${comps.map(c=>`<option value="${c.id}">${c.component_type}</option>`).join('')}</select></div>
 <div class="field"><label>Tipo de servicio</label><input id="mType" value="Revisión / ajuste"></div>
 <div class="dual"><div class="field"><label>Kilometraje</label><input id="mKm" type="number" value="0"></div><div class="field"><label>Costo</label><input id="mCost" type="number" value="0"></div></div>
 <div class="field"><label>Notas</label><textarea id="mNotes"></textarea></div>
 <button class="primary" onclick="saveMaintenance('${bikeId}')">GUARDAR MANTENIMIENTO</button></div>`;
}
async function saveMaintenance(bikeId){
 const row={bike_id:bikeId,component_id:mComponent.value||null,service_date:mDate.value,service_type:mType.value.trim(),odometer_km:Number(mKm.value)||0,cost:Number(mCost.value)||null,notes:mNotes.value.trim()};
 if(cloud.user&&cloud.client){
  const {data,error}=await cloud.client.from('maintenance_logs').insert({...row,user_id:cloud.user.id}).select().single();
  if(error)return alert(error.message);state.maintenance.unshift(data);
 }else state.maintenance.unshift({...row,id:'local-maint-'+Date.now()});
 localStorage.setItem(STORE,JSON.stringify(state));toast('Mantenimiento registrado');openBike(bikeId);
}


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

function home(){renderDashboard()}
function calendar(){let y=currentMonth.getFullYear(),m=currentMonth.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),offset=(first.getDay()+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=last.getDate();d++)cells.push(new Date(y,m,d));view.innerHTML=`<div class="section-title"><h2>Calendario</h2><button class="secondary" onclick="goToday()">Hoy</button></div><div class="card"><div class="month-head"><button class="secondary" onclick="moveMonth(-1)">‹</button><b>${first.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</b><button class="secondary" onclick="moveMonth(1)">›</button></div><div class="month-grid">${['L','M','X','J','V','S','D'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells.map(d=>{if(!d)return '<div class="day empty"></div>';let ds=iso(d),ev=plan.filter(x=>x.date===ds),cls='day';if(ds===today())cls+=' today';if(ds===state.selectedDate)cls+=' selected';return `<div class="${cls}" onclick="selectDate('${ds}')">${d.getDate()}<div class="dots">${ev.slice(0,3).map(x=>`<i class="dot ${x.type}"></i>`).join('')}</div></div>`}).join('')}</div></div><div class="card">${state.selectedDate?plan.filter(x=>x.date===state.selectedDate).map(x=>`<div onclick="openSession(${plan.indexOf(x)})">${item(x)}</div>`).join('')||'<p class="muted">Sin actividades.</p>':'<p class="muted">Selecciona un día.</p>'}</div>`}
function selectDate(d){state.selectedDate=d;save();calendar()}function moveMonth(n){currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+n,1);calendar()}function goToday(){let d=new Date();currentMonth=new Date(d.getFullYear(),d.getMonth(),1);state.selectedDate=today();calendar()}
function planView(){view.innerHTML=`<div class="section-title"><h2>Entrenamientos</h2><button class="secondary" onclick="exportICS()">Exportar .ics</button></div><div class="card">${plan.map((x,i)=>`<div onclick="openSession(${i})">${item(x)}</div>`).join('')}</div>`}
function legacyRoad(){view.innerHTML=`<section class="hero"><div class="eyebrow">Proyecto activo</div><h1>Paris–Brest–Paris 2027</h1><p class="muted">1.200 km · Road to Paris</p></section><div class="card">${[['200 km',1],['300 km',1],['400 km',0],['600 km',0],['1.000 km',0],['PBP 1.200 km',0]].map(x=>`<div class="bar"><b>${x[0]}</b><span class="${x[1]?'green':'muted'}">${x[1]?'✓':'○'}</span></div>`).join('')}</div>`}
function road(){renderRoadToParis()}
function more(){view.innerHTML=`<div class="section-title"><h2>Módulos</h2></div><div class="card"><div class="item" onclick="stravaModule()"><div class="icon">🟠</div><div class="item-main"><div class="item-title">Strava</div><div class="item-meta">Sincronizar actividades de ciclismo</div></div></div><div class="item" onclick="account()"><div class="icon">☁️</div><div class="item-main"><div class="item-title">Cuenta y nube</div><div class="item-meta">Inicio de sesión, respaldo y sincronización</div></div></div><div class="item" onclick="brevetsModule()"><div class="icon">🏁</div><div class="item-main"><div class="item-title">Gestión de brevets</div><div class="item-meta">Controles, progreso y modo en carrera</div></div></div><div class="item" onclick="bikesModule()"><div class="icon">🚲</div><div class="item-main"><div class="item-title">Bicicletas y mantenimiento</div><div class="item-meta">Componentes, kilometraje y servicios</div></div></div><div class="item" onclick="recoveryModule()"><div class="icon">♥</div><div class="item-main"><div class="item-title">Recuperación y rodilla</div><div class="item-meta">Sueño, fatiga, dolor y disposición diaria</div></div></div><div class="item" onclick="nutritionModule()"><div class="icon">🍌</div><div class="item-main"><div class="item-title">Nutrición para brevets</div><div class="item-meta">Plan, alimentos y consumo real</div></div></div><div class="item" onclick="profile()"><div class="icon">👤</div><div class="item-main"><div class="item-title">Perfil y peso</div><div class="item-meta">Datos deportivos e historial</div></div></div><div class="item" onclick="health()"><div class="icon">🦵</div><div class="item-main"><div class="item-title">Rodilla</div><div class="item-meta">Seguimiento de dolor</div></div></div><div class="item" onclick="nutrition()"><div class="icon">🍌</div><div class="item-main"><div class="item-title">Nutrición avanzada</div><div class="item-meta">Cálculo total y alimentos</div></div></div><div class="item" onclick="bike()"><div class="icon">🚲</div><div class="item-main"><div class="item-title">Bicicleta</div><div class="item-meta">Componentes y mantenciones</div></div></div><div class="item" onclick="brevet()"><div class="icon">🏁</div><div class="item-main"><div class="item-title">Modo Brevet</div><div class="item-meta">Información esencial</div></div></div></div>`}
function openSession(i){const x=plan[i]||next(),l=state.logs[key(x)]||{};view.innerHTML=`<div class="section-title"><h2>Registro</h2><button class="secondary" onclick="planView()">Volver</button></div><section class="hero"><div class="eyebrow">${x.type}</div><h1>${x.title}</h1><p class="muted">${x.date} · ${x.time}–${x.end}${x.km?` · ${x.km} km`:''}</p><p>${x.route||''}</p></section><div class="card"><div class="field"><label>Estado</label><select id="st"><option value="pending">Pendiente</option><option value="done">Realizado</option><option value="skipped">No realizado</option><option value="modified">Modificado</option></select></div><div class="field"><label>Kilómetros reales</label><input id="rk" type="number" step="0.1" value="${l.realKm??x.km??0}"></div><div class="field"><label>Dolor de rodilla 0–10</label><input id="rp" type="number" min="0" max="10" value="${l.pain??0}"></div><div class="field"><label>Notas</label><textarea id="notes">${l.notes||''}</textarea></div><button class="primary" onclick='saveSession(${JSON.stringify(key(x))})'>GUARDAR SESIÓN</button></div>`;st.value=l.status||'pending'}
function saveSession(k){const prev=state.logs[k]?.realKm||0;state.logs[k]={status:st.value,realKm:+rk.value||0,pain:+rp.value||0,notes:notes.value};state.bikeKm+=Math.max(0,(+rk.value||0)-prev);save();home()}
function health(){const l=state.knee.at(-1);view.innerHTML=`<div class="section-title"><h2>Rodilla</h2></div><div class="card"><div class="field"><label>Dolor durante</label><input id="pd" type="number" min="0" max="10" value="${l?.during??0}"></div><div class="field"><label>Dolor después</label><input id="pa" type="number" min="0" max="10" value="${l?.after??0}"></div><div class="field"><label>Dolor al día siguiente</label><input id="pn" type="number" min="0" max="10" value="${l?.next??0}"></div><button class="primary" onclick="saveKnee()">GUARDAR</button></div>`}
function saveKnee(){state.knee.push({date:today(),during:+pd.value,after:+pa.value,next:+pn.value});save();health()}
function profile(){let p=state.profile,w=state.weights;let max=Math.max(...w.map(x=>x.kg),81),min=Math.min(...w.map(x=>x.kg),74);view.innerHTML=`<div class="section-title"><h2>Perfil deportivo</h2></div><div class="card"><div class="field"><label>Nombre</label><input id="pnm" value="${p.name}"></div><div class="dual"><div class="field"><label>Edad</label><input id="pag" type="number" value="${p.age}"></div><div class="field"><label>Altura cm</label><input id="pht" type="number" value="${p.height}"></div></div><div class="field"><label>Peso actual kg</label><input id="pwt" type="number" step="0.1" value="${p.weight}"></div><div class="field"><label>Dieta</label><input id="pdt" value="${p.diet}"></div><button class="primary" onclick="saveProfile()">GUARDAR PERFIL Y PESO</button></div><div class="card"><div class="eyebrow">Evolución de peso</div><div class="chart">${w.slice(-8).map(x=>`<i title="${x.kg} kg" style="height:${20+((max-x.kg)/(max-min||1))*90}px"></i>`).join('')}</div>${w.slice(-5).reverse().map(x=>`<div class="bar"><span>${x.date}</span><b>${x.kg} kg</b></div>`).join('')}</div>`}
function saveProfile(){state.profile={...state.profile,name:pnm.value,age:+pag.value,height:+pht.value,weight:+pwt.value,diet:pdt.value};state.weights.push({date:today(),kg:+pwt.value});save();profile()}
function nutrition(){const n=state.nutrition,total={carbs:n.carbs*n.hours,water:n.water*n.hours,sodium:n.sodium*n.hours};view.innerHTML=`<div class="section-title"><h2>Nutrición avanzada</h2></div><div class="card"><div class="dual"><div class="field"><label>Horas estimadas</label><input id="nh" type="number" step="0.5" value="${n.hours}" oninput="nutritionPreview()"></div><div class="field"><label>Carbos g/h</label><input id="nc" type="number" value="${n.carbs}" oninput="nutritionPreview()"></div></div><div class="dual"><div class="field"><label>Agua ml/h</label><input id="nw" type="number" value="${n.water}" oninput="nutritionPreview()"></div><div class="field"><label>Sodio mg/h</label><input id="ns" type="number" value="${n.sodium}" oninput="nutritionPreview()"></div></div><div class="field"><label>Cafeína máxima mg</label><input id="nf" type="number" value="${n.caffeine}"></div><button class="primary" onclick="saveNutrition()">GUARDAR ESTRATEGIA</button></div><div id="nutriTotals" class="grid"><div class="card"><div class="tiny">CARBOS TOTALES</div><div class="metric">${total.carbs} g</div></div><div class="card"><div class="tiny">AGUA TOTAL</div><div class="metric">${(total.water/1000).toFixed(1)} L</div></div><div class="card"><div class="tiny">SODIO TOTAL</div><div class="metric">${total.sodium} mg</div></div><div class="card"><div class="tiny">CAFEÍNA MÁX.</div><div class="metric">${n.caffeine} mg</div></div></div><div class="section-title"><h2>Alimentos</h2></div><div class="card">${foods.map((f,i)=>`<div class="food-row"><div><b>${f.name}</b><div class="tiny">${f.carbs} g CHO · ${f.sodium} mg Na · ${f.caffeine} mg cafeína</div></div><input type="number" min="0" value="${n.selectedFoods[i]||0}" onchange="setFood(${i},this.value)"><span>${f.unit}</span></div>`).join('')}</div><div class="card" id="foodTotals">${foodTotals()}</div>`}
function nutritionPreview(){let h=+nh.value,c=+nc.value,w=+nw.value,s=+ns.value;nutriTotals.innerHTML=`<div class="card"><div class="tiny">CARBOS TOTALES</div><div class="metric">${(h*c).toFixed(0)} g</div></div><div class="card"><div class="tiny">AGUA TOTAL</div><div class="metric">${(h*w/1000).toFixed(1)} L</div></div><div class="card"><div class="tiny">SODIO TOTAL</div><div class="metric">${(h*s).toFixed(0)} mg</div></div><div class="card"><div class="tiny">CAFEÍNA MÁX.</div><div class="metric">${nf.value} mg</div></div>`}
function saveNutrition(){state.nutrition={...state.nutrition,hours:+nh.value,carbs:+nc.value,water:+nw.value,sodium:+ns.value,caffeine:+nf.value};save();nutrition()}
function setFood(i,v){state.nutrition.selectedFoods[i]=+v;save();foodTotalsEl=document.getElementById('foodTotals');if(foodTotalsEl)foodTotalsEl.innerHTML=foodTotals()}
function foodTotals(){let c=0,s=0,f=0;foods.forEach((x,i)=>{let q=state.nutrition.selectedFoods[i]||0;c+=x.carbs*q;s+=x.sodium*q;f+=x.caffeine*q});return `<div class="eyebrow">Total seleccionado</div><div class="bar"><span>Carbohidratos</span><b>${c} g</b></div><div class="bar"><span>Sodio</span><b>${s} mg</b></div><div class="bar"><span>Cafeína</span><b>${f} mg</b></div>`}
function bike(){let b=bikes[0];view.innerHTML=`<div class="section-title"><h2>${b.name}</h2></div><section class="hero"><div class="eyebrow">Kilometraje</div><div class="big-number">${state.bikeKm.toLocaleString('es-CL')}</div><p class="muted">km acumulados</p></section><div class="card">${b.components.map(x=>{let pct=Math.min(100,Math.round(x.current/x.limit*100));return `<div class="component"><div class="component-head"><b>${x.name}</b><span>${x.current}/${x.limit} km</span></div><div class="progress"><i class="${pct>80?'warn':''}" style="width:${pct}%"></i></div></div>`}).join('')}</div>`}
function brevet(){view.innerHTML=`<div class="brevet-screen"><div class="eyebrow green">Brevet en progreso</div><h2>1.000 km</h2><div class="big-number yellow">427</div><p class="muted">km completados</p><div class="dual"><div class="card"><div class="tiny">RESTANTES</div><div class="metric">573</div></div><div class="card"><div class="tiny">CONTROL</div><div class="metric">54 km</div></div></div><button class="primary" onclick="more()">SALIR</button></div>`}

async function initCloud(){
 try{
  const cfg=await fetch('/api/config').then(r=>r.json());
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase)return false;
  cloud.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  cloud.configured=true;
  const {data}=await cloud.client.auth.getSession();
  cloud.user=data.session?.user||null;
  if(cloud.user){await loadCloudState();await loadWorkouts(true);await loadNutritionLogs();await loadBrevets();}
  cloud.client.auth.onAuthStateChange(async(_event,session)=>{
   cloud.user=session?.user||null;
   if(cloud.user){await loadCloudState();await loadWorkouts(true);await loadNutritionLogs();await loadBrevets();}
   else home();
  });
  return true;
 }catch(e){console.warn('Cloud unavailable',e);return false}
}
function scheduleCloudSave(){
 if(!cloud.user||!cloud.client)return;
 clearTimeout(cloud.timer);
 cloud.timer=setTimeout(saveCloudState,700);
}
async function saveCloudState(){
 if(!cloud.user||!cloud.client||cloud.saving)return;
 cloud.saving=true;
 try{
  await cloud.client.from('user_state').upsert({
   user_id:cloud.user.id,
   state_json:state,
   updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
 }catch(e){console.warn('Cloud save failed',e)}
 cloud.saving=false;
}
async function loadCloudState(){
 if(!cloud.user||!cloud.client)return;
 try{
  const {data,error}=await cloud.client.from('user_state').select('state_json').eq('user_id',cloud.user.id).maybeSingle();
  if(error)throw error;
  if(data?.state_json){
   state={...state,...data.state_json};
   localStorage.setItem(STORE,JSON.stringify(state));
  }else await saveCloudState();
 }catch(e){console.warn('Cloud load failed',e)}
 home();
}
function authScreen(mode='login'){
 view.innerHTML=`<div class="auth-shell"><div class="auth-logo"><div class="logo">DOCH<span>20</span></div><div class="tagline">Built for the Long Ride</div></div><div class="card"><div class="eyebrow">${mode==='login'?'Iniciar sesión':'Crear cuenta'}</div><div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email"></div><div class="field"><label>Contraseña</label><input id="authPassword" type="password" minlength="6" autocomplete="${mode==='login'?'current-password':'new-password'}"></div><button class="primary" onclick="submitAuth('${mode}')">${mode==='login'?'ENTRAR':'CREAR CUENTA'}</button><button class="link-button" onclick="authScreen('${mode==='login'?'signup':'login'}')">${mode==='login'?'Crear una cuenta nueva':'Ya tengo una cuenta'}</button><button class="secondary" style="width:100%" onclick="home()">Continuar solo en este dispositivo</button><p id="authMessage" class="tiny" style="margin-top:12px"></p></div></div>`;
}
async function submitAuth(mode){
 if(!cloud.configured)return;
 authMessage.textContent='Procesando...';
 const email=authEmail.value.trim(),password=authPassword.value;
 let result;
 if(mode==='signup')result=await cloud.client.auth.signUp({email,password});
 else result=await cloud.client.auth.signInWithPassword({email,password});
 if(result.error){authMessage.textContent=result.error.message;return}
 authMessage.textContent=mode==='signup'?'Cuenta creada. Revisa tu email si se solicita confirmación.':'Sesión iniciada.';
 cloud.user=result.data.user||result.data.session?.user||null;
 if(cloud.user){await loadCloudState();await loadWorkouts(true);await loadNutritionLogs();await loadBrevets();}
}
async function account(){
 if(!cloud.configured){
  view.innerHTML=`<div class="section-title"><h2>Cuenta y nube</h2></div><div class="card"><div class="eyebrow red">Nube no configurada</div><p>DOCH20 sigue funcionando y guarda los datos en este dispositivo.</p><p class="muted">Para activar cuentas y respaldo agrega SUPABASE_URL y SUPABASE_ANON_KEY en Render.</p><button class="secondary" onclick="more()">Volver</button></div>`;
  return;
 }
 if(!cloud.user){authScreen('login');return}
 view.innerHTML=`<div class="section-title"><h2>Cuenta y nube</h2></div><section class="hero"><div class="eyebrow green">Sincronización activa</div><h1 class="account-email">${cloud.user.email}</h1><p class="muted">Tus registros se respaldan en Supabase.</p></section><div class="card"><button class="primary" onclick="saveCloudState()">SINCRONIZAR AHORA</button><button class="secondary danger" style="width:100%;margin-top:10px" onclick="signOut()">CERRAR SESIÓN</button></div>`;
}
async function signOut(){
 if(cloud.client)await cloud.client.auth.signOut();
 cloud.user=null;more();
}

function exportICS(){let o='BEGIN:VCALENDAR\\r\\nVERSION:2.0\\r\\n';plan.forEach((x,i)=>{let d=x.date.replaceAll('-','');o+=`BEGIN:VEVENT\\r\\nUID:doch20-${i}@app\\r\\nDTSTART:${d}T${x.time.replace(':','')}00\\r\\nDTEND:${d}T${x.end.replace(':','')}00\\r\\nSUMMARY:${x.title}\\r\\nEND:VEVENT\\r\\n`});o+='END:VCALENDAR\\r\\n';let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/calendar'}));a.download='DOCH20_plan.ics';a.click()}
function nav(v){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));({home,calendar,workouts,road,more}[v]||home)()}document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>nav(b.dataset.view));
Promise.all([fetch('/api/plan').then(r=>r.json()),fetch('/api/foods').then(r=>r.json()),fetch('/api/bikes').then(r=>r.json()),initCloud()]).then(async([p,f,b])=>{plan=p;foods=f;bikes=b;await loadWorkouts();await loadNutritionLogs();await loadBrevets();home()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js');
