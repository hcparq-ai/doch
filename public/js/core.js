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
  state.workouts=typeof normalizeWorkouts==='function'?normalizeWorkouts(data):Array.isArray(data)?data:[];
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

