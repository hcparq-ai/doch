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


