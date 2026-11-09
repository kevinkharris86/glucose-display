// Local-only helper: serves the photo cutter page, the uploaded photos, and saves results.
const http = require("http"), fs = require("fs"), path = require("path");
const UP = "C:/Users/kkmov/.claude/uploads/32fec60b-c09f-4e8a-8418-83fe8d189337";
const FILES = ["bcf9fcbf", "d1c824f8", "e39a2eb9", "e151f8cc", "ecb2214d", "4688d9e1", "96c953de", "9a5545d3", "45782d81", "51c80cae", "09a04c2e", "eadc8b2b", "f59595ae"].map(n => n + "-image.jpg");
const OUT = path.join(__dirname, "out"); fs.mkdirSync(OUT, { recursive: true });
http.createServer((q, s) => {
  const u = new URL(q.url, "http://x");
  if (u.pathname.startsWith("/img/")) {
    const f = FILES[+u.pathname.slice(5)]; if (!f) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { "Content-Type": "image/jpeg" }); return fs.createReadStream(path.join(UP, f)).pipe(s);
  }
  if (u.pathname.startsWith("/out/")) {
    const f = path.join(OUT, path.basename(u.pathname)); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { "Content-Type": f.endsWith(".png") ? "image/png" : "image/webp", "Cache-Control": "no-store" }); return fs.createReadStream(f).pipe(s);
  }
  if (q.method === "POST" && u.pathname.startsWith("/save/")) {
    const chunks = []; q.on("data", c => chunks.push(c));
    q.on("end", () => { fs.writeFileSync(path.join(OUT, path.basename(u.pathname)), Buffer.concat(chunks)); s.writeHead(200); s.end("ok"); });
    return;
  }
  const page = u.pathname === "/view" ? "view.html" : "cut.html";
  s.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }); s.end(fs.readFileSync(path.join(__dirname, page)));
}).listen(8201);
