const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const host = "127.0.0.1";
let port = Number(process.env.PORT || 5173);
const root = __dirname;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(root, cleanPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    const fallback = !path.extname(filePath);
    if (error && fallback) {
      fs.readFile(path.join(root, "index.html"), (indexError, indexContent) => {
        if (indexError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        response.writeHead(200, { "Content-Type": types[".html"] });
        response.end(indexContent);
      });
      return;
    }
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
});

function listen() {
  server.listen(port, host, () => {
    console.log(`Greezhub Dashboard running at http://${host}:${port}/`);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !process.env.PORT) {
    port += 1;
    listen();
    return;
  }
  throw error;
});

listen();
