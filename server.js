const http = require('node:http');
const { exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function safeResolve(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^([/\\])+/, '');
  const absolutePath = path.resolve(rootDir, normalizedPath);
  const relativePath = path.relative(rootDir, absolutePath);

  if (relativePath.startsWith('..') || (path.isAbsolute(relativePath) && relativePath.includes('..'))) {
    return null;
  }

  return absolutePath;
}



const server = http.createServer((req, res) => {
  const requestUrl = req.url || '/';
  const resolvedPath = safeResolve(requestUrl);
  if (!resolvedPath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }

    let filePath = resolvedPath;
    if (stats.isDirectory()) {
      filePath = path.join(resolvedPath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 404, 'Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

function openBrowser(url) {
  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command, error => {
    if (error) {
      console.warn(`Could not open browser automatically: ${error.message}`);
    }
  });
}

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`Server running at ${url}`);
  openBrowser(url);
});