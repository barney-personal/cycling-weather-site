// Shared static-file server for Playwright tests.
// Bound to 127.0.0.1 (NOT localhost — register-sw.ts skips localhost so the
// PWA layer would not boot under the test harness otherwise).

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
export const repoRoot = resolve(here, "..", "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

function mimeFor(p) {
  const ext = p.slice(p.lastIndexOf("."));
  return MIME[ext] || "application/octet-stream";
}

async function safeRead(urlPath) {
  const cleaned = normalize(urlPath).replace(/^\/+/, "");
  const target = join(repoRoot, cleaned);
  if (!target.startsWith(repoRoot)) throw new Error("traversal");
  const s = await stat(target);
  if (s.isDirectory()) throw new Error("dir");
  return { body: await readFile(target), path: target };
}

export async function startTestServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      const { body, path: p } = await safeRead(urlPath);
      res.writeHead(200, { "content-type": mimeFor(p) });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end(`not found: ${req.url}`);
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const close = () => new Promise((r) => server.close(() => r()));
  return { port, base, close };
}
