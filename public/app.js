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
async function loadWorkouts(){
 state.workouts=state.workouts||[];
 if(cloud.user&&cloud.client){
  try{
   const {data,error}=await cloud.client.from('workouts').select('*').order('date',{ascending:false}).order('created_at',{ascending:false});
   if(error)throw error;
   state.workouts=data||[];
   localStorage.setItem(STORE,JSON.stringify(state));
  }catch(e){console.warn('workouts load failed',e)}
 }
 return state.workouts;
}
function workoutIcon(t){return ({ruta:'🚴',gravel:'🟤',rodillo:'🌀',brevet:'🏁',gimnasio:'🏋️',kinesiologia:'🦵'})[t]||'🚴'}
function durationLabel(min){min=Number(min)||0;const h=Math.floor(min/60),m=min%60;return h?`${h}h ${m}m`:`${m} min`}
async function workouts(){
 await loadWorkouts();
 const w=state.workouts||[];
 const km=w.reduce((s,x)=>s+(Number(x.distance)||0),0);
 const mins=w.reduce((s,x)=>s+(Number(x.duration)||0),0);
 view.innerHTML=`<div class="section-title"><h2>Diario de entrenamiento</h2><button class="secondary" onclick="newWorkout()">Nuevo</button></div>
 <div class="workout-summary"><div class="card"><div class="tiny">SESIONES</div><div class="metric">${w.length}</div></div><div class="card"><div class="tiny">KM</div><div class="metric">${km.toFixed(0)}</div></div><div class="card"><div class="tiny">HORAS</div><div class="metric">${(mins/60).toFixed(1)}</div></div></div>
 <div class="card workout-list">${w.length?w.map(x=>`<div class="item"><div class="icon">${workoutIcon(x.type)}</div><div class="item-main"><div class="item-title">${x.type.charAt(0).toUpperCase()+x.type.slice(1)} · ${Number(x.distance||0).toFixed(1)} km</div><div class="item-meta">${x.date} · ${durationLabel(x.duration)} · ${x.elevation||0} m+</div><div class="item-meta">RPE ${x.rpe??'-'} · Rodilla ${x.knee_pain??'-'}/10</div>${x.notes?`<div class="item-meta">${x.notes}</div>`:''}</div><button class="secondary danger" onclick="deleteWorkout('${x.id}')">×</button></div>`).join(''):'<p class="muted">Todavía no hay entrenamientos registrados.</p>'}</div>
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

function home(){const n=next(),pct=Math.round(done()/Math.max(plan.length,1)*100),days=Math.max(0,Math.ceil((new Date('2027-08-15')-new Date())/86400000));view.innerHTML=`<section class="hero"><div class="eyebrow">Misión de hoy</div><h1>${n.title}</h1><p class="muted">${n.time}${n.km?` · ${n.km} km`:''}${n.zone?` · ${n.zone}`:''}</p><p class="tiny">${n.route||n.type}</p><button class="primary" onclick="openSession(${plan.indexOf(n)})">INICIAR / REGISTRAR</button></section><div class="grid"><div class="card"><div class="tiny">DÍAS A PBP</div><div class="metric">${days}</div></div><div class="card"><div class="tiny">KM REALIZADOS</div><div class="metric">${realKm().toFixed(0)}</div></div></div><div class="card"><div class="eyebrow">Perfil</div><div class="cloud-state"><i class="cloud-dot ${cloud.user?'on':'off'}"></i>${cloud.user?'Sincronización activa':'Datos guardados en este dispositivo'}</div><div class="bar"><b>${state.profile.name}</b><span>${state.profile.weight} kg</span></div><div class="bar"><span>${state.profile.goal}</span><span>${state.profile.goalDate}</span></div></div><div class="card"><div class="eyebrow">Resumen real</div><div class="bar"><span>Entrenamientos del diario</span><b>${(state.workouts||[]).length}</b></div><div class="bar"><span>Kilómetros registrados</span><b>${(state.workouts||[]).reduce((s,x)=>s+(Number(x.distance)||0),0).toFixed(0)} km</b></div></div><div class="card"><div class="eyebrow">Road to Paris</div><div class="bar"><b>PBP 1200 km</b><span>${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div><div class="section-title"><h2>Próximas sesiones</h2></div><div class="card">${plan.filter(x=>x.date>=today()).slice(0,5).map(item).join('')}</div>`}
function calendar(){let y=currentMonth.getFullYear(),m=currentMonth.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),offset=(first.getDay()+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=last.getDate();d++)cells.push(new Date(y,m,d));view.innerHTML=`<div class="section-title"><h2>Calendario</h2><button class="secondary" onclick="goToday()">Hoy</button></div><div class="card"><div class="month-head"><button class="secondary" onclick="moveMonth(-1)">‹</button><b>${first.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</b><button class="secondary" onclick="moveMonth(1)">›</button></div><div class="month-grid">${['L','M','X','J','V','S','D'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells.map(d=>{if(!d)return '<div class="day empty"></div>';let ds=iso(d),ev=plan.filter(x=>x.date===ds),cls='day';if(ds===today())cls+=' today';if(ds===state.selectedDate)cls+=' selected';return `<div class="${cls}" onclick="selectDate('${ds}')">${d.getDate()}<div class="dots">${ev.slice(0,3).map(x=>`<i class="dot ${x.type}"></i>`).join('')}</div></div>`}).join('')}</div></div><div class="card">${state.selectedDate?plan.filter(x=>x.date===state.selectedDate).map(x=>`<div onclick="openSession(${plan.indexOf(x)})">${item(x)}</div>`).join('')||'<p class="muted">Sin actividades.</p>':'<p class="muted">Selecciona un día.</p>'}</div>`}
function selectDate(d){state.selectedDate=d;save();calendar()}function moveMonth(n){currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+n,1);calendar()}function goToday(){let d=new Date();currentMonth=new Date(d.getFullYear(),d.getMonth(),1);state.selectedDate=today();calendar()}
function planView(){view.innerHTML=`<div class="section-title"><h2>Entrenamientos</h2><button class="secondary" onclick="exportICS()">Exportar .ics</button></div><div class="card">${plan.map((x,i)=>`<div onclick="openSession(${i})">${item(x)}</div>`).join('')}</div>`}
function road(){view.innerHTML=`<section class="hero"><div class="eyebrow">Proyecto activo</div><h1>Paris–Brest–Paris 2027</h1><p class="muted">1.200 km · Road to Paris</p></section><div class="card">${[['200 km',1],['300 km',1],['400 km',0],['600 km',0],['1.000 km',0],['PBP 1.200 km',0]].map(x=>`<div class="bar"><b>${x[0]}</b><span class="${x[1]?'green':'muted'}">${x[1]?'✓':'○'}</span></div>`).join('')}</div>`}
function more(){view.innerHTML=`<div class="section-title"><h2>Módulos</h2></div><div class="card"><div class="item" onclick="account()"><div class="icon">☁️</div><div class="item-main"><div class="item-title">Cuenta y nube</div><div class="item-meta">Inicio de sesión, respaldo y sincronización</div></div></div><div class="item" onclick="profile()"><div class="icon">👤</div><div class="item-main"><div class="item-title">Perfil y peso</div><div class="item-meta">Datos deportivos e historial</div></div></div><div class="item" onclick="health()"><div class="icon">🦵</div><div class="item-main"><div class="item-title">Rodilla</div><div class="item-meta">Seguimiento de dolor</div></div></div><div class="item" onclick="nutrition()"><div class="icon">🍌</div><div class="item-main"><div class="item-title">Nutrición avanzada</div><div class="item-meta">Cálculo total y alimentos</div></div></div><div class="item" onclick="bike()"><div class="icon">🚲</div><div class="item-main"><div class="item-title">Bicicleta</div><div class="item-meta">Componentes y mantenciones</div></div></div><div class="item" onclick="brevet()"><div class="icon">🏁</div><div class="item-main"><div class="item-title">Modo Brevet</div><div class="item-meta">Información esencial</div></div></div></div>`}
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
  if(cloud.user){await loadCloudState();await loadWorkouts();}
  cloud.client.auth.onAuthStateChange(async(_event,session)=>{
   cloud.user=session?.user||null;
   if(cloud.user){await loadCloudState();await loadWorkouts();}
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
 if(cloud.user){await loadCloudState();await loadWorkouts();}
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
Promise.all([fetch('/api/plan').then(r=>r.json()),fetch('/api/foods').then(r=>r.json()),fetch('/api/bikes').then(r=>r.json()),initCloud()]).then(async([p,f,b])=>{plan=p;foods=f;bikes=b;await loadWorkouts();home()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js');
