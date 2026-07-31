import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const BASE=process.env.APP_BASE_URL||`http://localhost:${PORT}`;
const STORE=path.join(__dirname,'data/store.json');
const PLAN=JSON.parse(fs.readFileSync(path.join(__dirname,'data/plan.json'),'utf8'));
const PUBLIC=path.join(__dirname,'public');
function load(){return JSON.parse(fs.readFileSync(STORE,'utf8'));}
function save(x){fs.writeFileSync(STORE,JSON.stringify(x,null,2));}
function aesKey(){return crypto.createHash('sha256').update(process.env.APP_SECRET||'doch20-dev-only').digest();}
function enc(obj){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',aesKey(),iv);const b=Buffer.concat([c.update(JSON.stringify(obj),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),b]).toString('base64');}
function dec(s){const b=Buffer.from(s,'base64'),iv=b.subarray(0,12),tag=b.subarray(12,28),body=b.subarray(28),d=crypto.createDecipheriv('aes-256-gcm',aesKey(),iv);d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(body),d.final()]).toString('utf8'));}
function send(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type});res.end(type==='application/json'?JSON.stringify(body):body);}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e)}});req.on('error',reject)});}
function serveFile(res,file){if(!fs.existsSync(file))return send(res,404,'Not found','text/plain');const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};send(res,200,fs.readFileSync(file),types[ext]||'application/octet-stream');}
function esc(x){return String(x||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');}
async function stravaToken(){const s=load();if(!s.strava)throw new Error('Strava no conectado');let t=dec(s.strava);if((t.expires_at||0)*1000<Date.now()+60000){const r=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.STRAVA_CLIENT_ID,client_secret:process.env.STRAVA_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:t.refresh_token})});if(!r.ok)throw new Error(await r.text());t=await r.json();s.strava=enc(t);save(s);}return t.access_token;}

const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,BASE);
  if(req.method==='GET'&&u.pathname==='/api/plan')return send(res,200,PLAN);
  if(req.method==='GET'&&u.pathname==='/api/state'){const s=load();return send(res,200,{progress:s.progress,manual:s.manual,stravaConnected:!!s.strava});}
  if(req.method==='PUT'&&u.pathname.startsWith('/api/progress/')){const id=decodeURIComponent(u.pathname.slice('/api/progress/'.length)),b=await body(req),s=load();s.progress[id]={...(s.progress[id]||{}),...b};save(s);return send(res,200,{ok:true});}
  if(req.method==='POST'&&u.pathname==='/api/manual'){const b=await body(req),s=load();s.manual.push({id:crypto.randomUUID(),...b});save(s);return send(res,200,{ok:true});}
  if(req.method==='GET'&&u.pathname==='/api/calendar.ics'){let out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DOCH20//Brevet//ES','CALSCALE:GREGORIAN','X-WR-CALNAME:DOCH20 - Brevet 1000 km','X-WR-TIMEZONE:America/Santiago'];PLAN.forEach((x,i)=>out.push('BEGIN:VEVENT',`UID:doch20-${i}@local`,`DTSTART;TZID=America/Santiago:${x.date.replaceAll('-','')}T${x.start.replace(':','')}00`,`DTEND;TZID=America/Santiago:${x.date.replaceAll('-','')}T${x.end.replace(':','')}00`,`SUMMARY:${esc(x.title)}`,`DESCRIPTION:${esc([x.desc,x.route,x.zone,x.km?x.km+' km':''].filter(Boolean).join(' | '))}`,'END:VEVENT'));out.push('END:VCALENDAR');res.writeHead(200,{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="DOCH20_Brevet_1000km.ics"'});return res.end(out.join('\r\n'));}
  if(req.method==='GET'&&u.pathname==='/api/strava/connect'){if(!process.env.STRAVA_CLIENT_ID)return send(res,503,'Configura STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en .env','text/plain');const p=new URLSearchParams({client_id:process.env.STRAVA_CLIENT_ID,response_type:'code',redirect_uri:process.env.STRAVA_REDIRECT_URI||`${BASE}/api/strava/callback`,approval_prompt:'auto',scope:'read,activity:read_all'});res.writeHead(302,{Location:`https://www.strava.com/oauth/authorize?${p}`});return res.end();}
  if(req.method==='GET'&&u.pathname==='/api/strava/callback'){if(!u.searchParams.get('code'))throw new Error('Strava no devolvió código');const r=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.STRAVA_CLIENT_ID,client_secret:process.env.STRAVA_CLIENT_SECRET,code:u.searchParams.get('code'),grant_type:'authorization_code'})});if(!r.ok)throw new Error(await r.text());const tok=await r.json(),s=load();s.strava=enc(tok);save(s);res.writeHead(302,{Location:'/?strava=connected'});return res.end();}
  if(req.method==='POST'&&u.pathname==='/api/strava/sync'){const access=await stravaToken(),after=Math.floor(new Date('2026-07-28T00:00:00-04:00').getTime()/1000),r=await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`,{headers:{Authorization:`Bearer ${access}`}});if(!r.ok)throw new Error(await r.text());const acts=await r.json(),rides=acts.filter(a=>['Ride','VirtualRide','MountainBikeRide','GravelRide','EBikeRide'].includes(a.sport_type||a.type)),s=load();for(const a of rides){const d=a.start_date_local.slice(0,10),c=PLAN.map((p,i)=>({p,i})).filter(x=>x.p.type==='bike'&&Math.abs((new Date(x.p.date)-new Date(d))/86400000)<=1);if(!c.length)continue;c.sort((a1,a2)=>Math.abs(a1.p.km-a.distance/1000)-Math.abs(a2.p.km-a.distance/1000));const p=c[0].p,id=`${p.date}|${p.start}|${p.title}`;s.progress[id]={...(s.progress[id]||{}),done:true,km:Number((a.distance/1000).toFixed(2)),seconds:a.moving_time,elevation:a.total_elevation_gain,stravaId:a.id,stravaName:a.name};}save(s);return send(res,200,{ok:true,imported:rides.length});}
  if(req.method==='POST'&&u.pathname==='/api/strava/disconnect'){const s=load();s.strava=null;save(s);return send(res,200,{ok:true});}
  const rel=u.pathname==='/'?'index.html':u.pathname.slice(1),file=path.normalize(path.join(PUBLIC,rel));if(!file.startsWith(PUBLIC))return send(res,403,'Forbidden','text/plain');if(fs.existsSync(file))return serveFile(res,file);return serveFile(res,path.join(PUBLIC,'index.html'));
 }catch(e){send(res,500,{ok:false,error:String(e)});}
});
server.listen(PORT,()=>console.log(`DOCH20 en ${BASE}`));
