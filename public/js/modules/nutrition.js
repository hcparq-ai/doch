

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


