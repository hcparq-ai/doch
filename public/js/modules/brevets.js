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


