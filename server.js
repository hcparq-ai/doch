const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,PUBLIC=path.join(__dirname,'public'),DATA=path.join(__dirname,'data');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let u=req.url.split('?')[0];
 if(u==='/api/plan'){res.writeHead(200,{'Content-Type':mime['.json']});return fs.createReadStream(path.join(DATA,'plan.json')).pipe(res)}
 if(u==='/health'){res.writeHead(200,{'Content-Type':mime['.json']});return res.end(JSON.stringify({ok:true,version:'3.0.0'}))}
 if(u==='/')u='/index.html';let f=path.join(PUBLIC,u);
 if(!f.startsWith(PUBLIC)){res.writeHead(403);return res.end('Forbidden')}
 fs.stat(f,(e,s)=>{if(e||!s.isFile())f=path.join(PUBLIC,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)})
}).listen(PORT,()=>console.log(`DOCH20 V3 en http://localhost:${PORT}`));
