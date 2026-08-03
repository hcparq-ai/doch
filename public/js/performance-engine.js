
function performanceDateRangeDays(days){
 const output=[];
 const now=new Date();
 now.setHours(0,0,0,0);

 for(let index=days-1;index>=0;index--){
  const date=new Date(now);
  date.setDate(date.getDate()-index);
  output.push(date.toISOString().slice(0,10));
 }

 return output;
}


function trainingLoadForWorkout(workout){
 const w=typeof normalizeWorkout==='function'?normalizeWorkout(workout):workout;
 const minutes=Math.max(0,Number(w.duration||0));
 const hours=minutes/60;
 const distance=Math.max(0,Number(w.distance||0));
 const elevation=Math.max(0,Number(w.elevation||0));
 const hr=Number(w.average_heartrate||0);
 const watts=Number(w.average_watts||0);
 const rpe=Number(w.rpe||0);
 const type=String(w.type||'otro');

 const baseDuration=hours*35;
 const baseDistance=distance*.18;
 const climbing=elevation/1000*16;
 const typeFactor={ruta:1,gravel:1.08,rodillo:.92,brevet:1.15,gimnasio:.75,kinesiologia:.28}[type]||1;
 const intensityFromRpe=rpe>0?Math.max(.65,Math.min(1.55,rpe/6)):1;
 const intensityFromHr=hr>0?Math.max(.8,Math.min(1.35,hr/140)):1;
 const intensityFromPower=watts>0?Math.max(.85,Math.min(1.35,watts/180)):1;

 const load=(baseDuration+baseDistance+climbing)*typeFactor*intensityFromRpe*intensityFromHr*intensityFromPower;
 return Math.max(0,Math.round(load));
}
function performanceDailySeries(days=365){
 const keys=performanceDateRangeDays(days);
 const map=Object.fromEntries(keys.map(k=>[k,0]));
 const workouts=typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[];
 workouts.forEach(w=>{
  if(map[w.date]!==undefined)map[w.date]+=trainingLoadForWorkout(w);
 });
 return keys.map(date=>({date,load:map[date]}));
}
function seededEwma(values,days){
 const nonZero=values.filter(v=>Number(v)>0);
 const seedCount=Math.min(days,nonZero.length);
 const seed=seedCount?nonZero.slice(0,seedCount).reduce((a,b)=>a+b,0)/seedCount:0;
 const alpha=1/days;
 let value=seed;
 return values.map(v=>{
  value=value+(Number(v||0)-value)*alpha;
  return value;
 });
}
function performanceEngine(){
 const daily=performanceDailySeries(365);
 const loads=daily.map(x=>x.load);
 const ctl=seededEwma(loads,42);
 const atl=seededEwma(loads,7);
 const tsb=ctl.map((v,i)=>v-atl[i]);

 const current={
  ctl:ctl.at(-1)||0,
  atl:atl.at(-1)||0,
  tsb:tsb.at(-1)||0,
  today:loads.at(-1)||0
 };

 const weeks=[];
 for(let i=11;i>=0;i--){
  const start=startOfWeek(new Date(Date.now()-i*7*86400000));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const workouts=(typeof normalizeWorkouts==='function'?normalizeWorkouts(state.workouts||[]):state.workouts||[])
   .filter(w=>{const d=parseLocalDate(w.date);return d>=start&&d<end});
  weeks.push({
   label:`${start.getDate()}/${start.getMonth()+1}`,
   load:workouts.reduce((s,w)=>s+trainingLoadForWorkout(w),0),
   km:workouts.reduce((s,w)=>s+Number(w.distance||0),0),
   hours:workouts.reduce((s,w)=>s+Number(w.duration||0),0)/60
  });
 }

 const last4=weeks.slice(-4).reduce((s,w)=>s+w.load,0);
 const prev4=weeks.slice(-8,-4).reduce((s,w)=>s+w.load,0);
 const change=prev4>0?(last4-prev4)/prev4*100:0;
 const rampRate=weeks.length>=2?weeks.at(-1).load-weeks.at(-2).load:0;
 const recoveryHours=Math.max(0,Math.round(current.atl*1.6-current.tsb*.8));
 const activeDays=loads.filter(v=>v>0).length;

 return {daily,loads,ctl,atl,tsb,current,weeks,last4,prev4,change,rampRate,recoveryHours,activeDays};
}
function simulateWorkoutImpact({duration=120,distance=50,elevation=400,rpe=5,type='ruta'}={}){
 const simulated=trainingLoadForWorkout({duration,distance,elevation,rpe,type,date:today()});
 const p=performanceEngine();
 const nextAtl=p.current.atl+(simulated-p.current.atl)/7;
 const nextCtl=p.current.ctl+(simulated-p.current.ctl)/42;
 const nextTsb=nextCtl-nextAtl;
 return {load:simulated,ctl:nextCtl,atl:nextAtl,tsb:nextTsb};
}
function readinessFromPerformance(p){
 const tsb=p.current.tsb;
 if(tsb>10)return {label:'Fresco',level:'green'};
 if(tsb>-10)return {label:'Equilibrado',level:'amber'};
 return {label:'Fatiga acumulada',level:'red'};
}
