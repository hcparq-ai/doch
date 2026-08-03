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
