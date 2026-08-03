const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let url=req.url.split('?')[0];
  if(url==='/api/plan'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});return fs.createReadStream(path.join(DATA,'plan.json')).pipe(res);}
  if(url==='/')url='/index.html';
  let file=path.join(PUBLIC,url);
  if(!file.startsWith(PUBLIC)){res.writeHead(403);return res.end('Forbidden');}
  fs.stat(file,(err,st)=>{
    if(err||!st.isFile())file=path.join(PUBLIC,'index.html');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT,()=>console.log(`DOCH20 V2 en http://localhost:${PORT}`));
