const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg"
};

http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const filename = path.resolve(root, requested);
    if (!filename.startsWith(root + path.sep)) {
        response.writeHead(403).end("Forbidden");
        return;
    }
    fs.readFile(filename, (error, data) => {
        if (error) {
            response.writeHead(404).end("Not found");
            return;
        }
        response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filename)] || "application/octet-stream" });
        response.end(data);
    });
}).listen(4174, "127.0.0.1");