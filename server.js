const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');
const BASE = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const STRAVA_STATE_SECRET = process.env.STRAVA_STATE_SECRET || '';

const mime = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml',
  '.png':'image/png'
};

function json(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
function redirect(res, location) {
  res.writeHead(302, {Location: location, 'Cache-Control':'no-store'});
  res.end();
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}
function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}
async function verifyUser(req) {
  const token = bearer(req);
  if (!token) throw new Error('Sesión requerida');
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {apikey: SUPABASE_ANON_KEY, Authorization:`Bearer ${token}`}
  });
  if (!r.ok) throw new Error('Sesión inválida');
  const user = await r.json();
  return {user, token};
}
function adminHeaders(extra={}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization:`Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type':'application/json',
    ...extra
  };
}
function signState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', STRAVA_STATE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifyState(value) {
  const [data, sig] = String(value || '').split('.');
  if (!data || !sig) throw new Error('State inválido');
  const expected = crypto.createHmac('sha256', STRAVA_STATE_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Firma inválida');
  }
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (!payload.exp || Date.now() > payload.exp) throw new Error('State vencido');
  return payload;
}
async function getConnection(userId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/strava_connections?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: adminHeaders()
  });
  if (!r.ok) throw new Error(`Supabase connection: ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}
async function upsertConnection(row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/strava_connections?on_conflict=user_id`, {
    method:'POST',
    headers: adminHeaders({Prefer:'resolution=merge-duplicates,return=representation'}),
    body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error(`Guardar conexión: ${await r.text()}`);
  return (await r.json())[0];
}
async function deleteConnection(userId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/strava_connections?user_id=eq.${encodeURIComponent(userId)}`, {
    method:'DELETE', headers:adminHeaders()
  });
  if (!r.ok) throw new Error(await r.text());
}
async function refreshIfNeeded(conn) {
  if (Number(conn.expires_at) > Math.floor(Date.now()/1000) + 300) return conn;
  const body = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    grant_type:'refresh_token',
    refresh_token:conn.refresh_token
  });
  const r = await fetch('https://www.strava.com/oauth/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body
  });
  if (!r.ok) throw new Error(`Renovar Strava: ${await r.text()}`);
  const t = await r.json();
  return upsertConnection({
    ...conn,
    access_token:t.access_token,
    refresh_token:t.refresh_token,
    expires_at:t.expires_at,
    updated_at:new Date().toISOString()
  });
}
function workoutType(activity) {
  const sport = String(activity.sport_type || activity.type || '').toLowerCase();
  if (sport.includes('virtual')) return 'rodillo';
  if (sport.includes('gravel') || sport.includes('mountain')) return 'gravel';
  return 'ruta';
}
async function importActivities(userId, accessToken, page=1, perPage=50) {
  const url = new URL('https://www.strava.com/api/v3/athlete/activities');
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  const r = await fetch(url, {headers:{Authorization:`Bearer ${accessToken}`}});
  if (!r.ok) throw new Error(`Strava activities: ${await r.text()}`);
  const activities = await r.json();
  const rows = activities.map(a => ({
    user_id:userId,
    date:String(a.start_date_local || a.start_date).slice(0,10),
    type:workoutType(a),
    distance:Number(a.distance || 0)/1000,
    duration:Math.round(Number(a.elapsed_time || 0)/60),
    moving_time:Number(a.moving_time || 0),
    elevation:Math.round(Number(a.total_elevation_gain || 0)),
    rpe:null,
    knee_pain:null,
    notes:'Importado automáticamente desde Strava',
    source:'strava',
    external_id:String(a.id),
    average_heartrate:a.average_heartrate ?? null,
    average_watts:a.average_watts ?? null,
    average_speed:a.average_speed ?? null,
    max_speed:a.max_speed ?? null,
    average_cadence:a.average_cadence ?? null,
    calories:a.calories ?? null,
    summary_polyline:a.map?.summary_polyline ?? null,
    strava_url:`https://www.strava.com/activities/${a.id}`,
    activity_name:a.name || 'Actividad Strava'
  }));
  if (!rows.length) return {imported:0,total:0};
  const s = await fetch(`${SUPABASE_URL}/rest/v1/workouts?on_conflict=user_id,source,external_id`, {
    method:'POST',
    headers:adminHeaders({Prefer:'resolution=merge-duplicates,return=representation'}),
    body:JSON.stringify(rows)
  });
  if (!s.ok) throw new Error(`Importar workouts: ${await s.text()}`);
  const saved = await s.json();
  return {imported:saved.length,total:activities.length};
}
function configured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SECRET_KEY &&
    STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET && STRAVA_STATE_SECRET);
}

http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, BASE);

    if (url.pathname === '/health') {
      return json(res,200,{ok:true,version:'12.1.0',stravaConfigured:configured()});
    }
    if (url.pathname === '/api/config') {
      return json(res,200,{supabaseUrl:SUPABASE_URL,supabaseAnonKey:SUPABASE_ANON_KEY});
    }
    const dataMap = {'/api/plan':'plan.json','/api/foods':'foods.json','/api/bikes':'bikes.json'};
    if (dataMap[url.pathname]) {
      const f = path.join(DATA,dataMap[url.pathname]);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
      return fs.createReadStream(f).pipe(res);
    }

    if (url.pathname === '/api/strava/start' && req.method === 'POST') {
      if (!configured()) return json(res,503,{error:'Strava no configurado en Render'});
      const {user} = await verifyUser(req);
      const state = signState({uid:user.id,exp:Date.now()+10*60*1000,nonce:crypto.randomUUID()});
      const auth = new URL('https://www.strava.com/oauth/authorize');
      auth.searchParams.set('client_id',STRAVA_CLIENT_ID);
      auth.searchParams.set('redirect_uri',`${BASE}/api/strava/callback`);
      auth.searchParams.set('response_type','code');
      auth.searchParams.set('approval_prompt','auto');
      auth.searchParams.set('scope','read,activity:read_all');
      auth.searchParams.set('state',state);
      return json(res,200,{url:auth.toString()});
    }

    if (url.pathname === '/api/strava/callback') {
      if (url.searchParams.get('error')) {
        return redirect(res,`${BASE}/?strava=denied`);
      }
      const state = verifyState(url.searchParams.get('state'));
      const code = url.searchParams.get('code');
      if (!code) throw new Error('Código OAuth ausente');
      const body = new URLSearchParams({
        client_id:STRAVA_CLIENT_ID,
        client_secret:STRAVA_CLIENT_SECRET,
        code,
        grant_type:'authorization_code'
      });
      const r = await fetch('https://www.strava.com/oauth/token', {
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body
      });
      if (!r.ok) throw new Error(`OAuth Strava: ${await r.text()}`);
      const t = await r.json();
      const athleteName = [t.athlete?.firstname,t.athlete?.lastname].filter(Boolean).join(' ');
      await upsertConnection({
        user_id:state.uid,
        athlete_id:t.athlete?.id || null,
        athlete_name:athleteName || null,
        access_token:t.access_token,
        refresh_token:t.refresh_token,
        expires_at:t.expires_at,
        scope:url.searchParams.get('scope') || 'read,activity:read_all',
        updated_at:new Date().toISOString()
      });
      return redirect(res,`${BASE}/?strava=connected`);
    }

    if (url.pathname === '/api/strava/status' && req.method === 'GET') {
      const {user} = await verifyUser(req);
      const c = await getConnection(user.id);
      return json(res,200,{connected:Boolean(c),athleteName:c?.athlete_name || null});
    }

    if (url.pathname === '/api/strava/sync' && req.method === 'POST') {
      const {user} = await verifyUser(req);
      let c = await getConnection(user.id);
      if (!c) return json(res,409,{error:'Strava no está conectado'});
      c = await refreshIfNeeded(c);
      const result = await importActivities(user.id,c.access_token);
      return json(res,200,result);
    }

    if (url.pathname === '/api/strava/disconnect' && req.method === 'POST') {
      const {user} = await verifyUser(req);
      const c = await getConnection(user.id);
      if (c) {
        try {
          await fetch('https://www.strava.com/oauth/deauthorize', {
            method:'POST',
            headers:{Authorization:`Bearer ${c.access_token}`}
          });
        } catch {}
        await deleteConnection(user.id);
      }
      return json(res,200,{ok:true});
    }

    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    let file = path.join(PUBLIC,pathname);
    if (!file.startsWith(PUBLIC)) {
      res.writeHead(403); return res.end('Forbidden');
    }
    fs.stat(file,(err,st)=>{
      if (err || !st.isFile()) file=path.join(PUBLIC,'index.html');
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) {
    console.error(e);
    json(res,500,{error:e.message || 'Error interno'});
  }
}).listen(PORT,()=>console.log(`DOCH20 V12.1 en http://localhost:${PORT}`));
