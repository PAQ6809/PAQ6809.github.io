import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = path.resolve(process.cwd(), '..');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

// ponytail: The E2E fixture server intentionally supports only local GET/HEAD files;
// replace it with the production server only if HTTP behavior enters the test scope.
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}`).pathname);
    let filePath = path.resolve(root, pathname.replace(/^\/+/, ''));
    const relative = path.relative(root, filePath);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      response.writeHead(403).end();
      return;
    }

    let details = await stat(filePath);
    if (details.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      details = await stat(filePath);
    }
    if (!details.isFile()) throw new Error('not a file');

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': details.size,
      'content-type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(port, host, () => console.log(`EduCraft test server: http://${host}:${port}/educraft/`));
