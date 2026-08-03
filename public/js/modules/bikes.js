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


