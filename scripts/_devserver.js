const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.argv[2] || 5057;

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const filePath = path.join(ROOT, p);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + p); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`));
