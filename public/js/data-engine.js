
function firstDefined(...values){
 for(const value of values){
  if(value!==undefined&&value!==null&&value!=='')return value;
 }
 return null;
}
function numericValue(...values){
 const value=firstDefined(...values);
 if(value===null)return 0;
 const number=Number(value);
 return Number.isFinite(number)?number:0;
}
function normalizeDateValue(value){
 if(!value)return '';
 const raw=String(value);
 const direct=raw.match(/^(\d{4}-\d{2}-\d{2})/);
 if(direct)return direct[1];
 const parsed=new Date(raw);
 return Number.isNaN(parsed.getTime())?'':parsed.toISOString().slice(0,10);
}
function normalizeWorkoutTypeValue(workout){
 const raw=String(firstDefined(workout.type,workout.sport_type,workout.activity_type,workout.strava_type,'')).toLowerCase();
 if(raw.includes('virtual')||raw.includes('indoor')||raw.includes('rodillo'))return 'rodillo';
 if(raw.includes('gravel')||raw.includes('mountain')||raw.includes('mtb'))return 'gravel';
 if(raw.includes('ride')||raw.includes('cycling')||raw.includes('ruta')||raw.includes('bike'))return 'ruta';
 if(raw.includes('brevet'))return 'brevet';
 if(raw.includes('kine')||raw.includes('fisio'))return 'kinesiologia';
 if(raw.includes('gym')||raw.includes('strength')||raw.includes('gimnasio'))return 'gimnasio';
 return raw||'otro';
}
function normalizeDistanceKm(workout){
 const explicit=numericValue(workout.distance,workout.distance_km,workout.km);
 if(explicit<=0)return 0;
 if(workout.distance_meters!==undefined)return numericValue(workout.distance_meters)/1000;
 if(explicit>2000)return explicit/1000;
 return explicit;
}
function normalizeDurationMinutes(workout){
 const explicit=numericValue(workout.duration,workout.duration_minutes,workout.minutes);
 if(explicit>0)return explicit;
 const seconds=numericValue(workout.moving_time,workout.elapsed_time,workout.duration_seconds);
 return seconds>0?seconds/60:0;
}
function normalizeWorkout(workout){
 const normalized={...workout};
 normalized.date=normalizeDateValue(firstDefined(workout.date,workout.start_date_local,workout.start_date,workout.activity_date,workout.created_at));
 normalized.type=normalizeWorkoutTypeValue(workout);
 normalized.distance=normalizeDistanceKm(workout);
 normalized.duration=normalizeDurationMinutes(workout);
 normalized.elevation=numericValue(workout.elevation,workout.total_elevation_gain,workout.elevation_gain,workout.ascent);
 normalized.average_heartrate=numericValue(workout.average_heartrate,workout.avg_hr,workout.heart_rate)||null;
 normalized.average_watts=numericValue(workout.average_watts,workout.avg_watts,workout.weighted_average_watts)||null;
 normalized.activity_name=firstDefined(workout.activity_name,workout.name,workout.title,normalized.type);
 normalized.source=String(firstDefined(workout.source,workout.provider,workout.external_id?'strava':'manual')).toLowerCase();
 return normalized;
}
function normalizeWorkouts(list){
 return (Array.isArray(list)?list:[])
  .map(normalizeWorkout)
  .filter(workout=>workout.date)
  .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function rideWorkout(workout){
 return ['ruta','gravel','rodillo','brevet'].includes(workout.type)&&Number(workout.distance)>0;
}
function dataQualityReport(){
 const all=normalizeWorkouts(state.workouts||[]);
 const rides=all.filter(rideWorkout);
 const withDistance=all.filter(w=>Number(w.distance)>0);
 const withDuration=all.filter(w=>Number(w.duration)>0);
 const withElevation=all.filter(w=>Number(w.elevation)>0);
 const strava=all.filter(w=>w.source==='strava');
 const newest=all[0]||null;
 const oldest=all.at(-1)||null;
 return {
  all,rides,
  total:all.length,
  rideCount:rides.length,
  stravaCount:strava.length,
  manualCount:all.length-strava.length,
  withDistance:withDistance.length,
  withDuration:withDuration.length,
  withElevation:withElevation.length,
  newest,oldest,
  usable:rides.length>0
 };
}
function applyNormalizedWorkouts(){
 state.workouts=normalizeWorkouts(state.workouts||[]);
 return state.workouts;
}
