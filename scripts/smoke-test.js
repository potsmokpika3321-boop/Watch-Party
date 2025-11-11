#!/usr/bin/env node
/*
  Smoke test for WatchParty server.
  - Starts the server in-process
  - Waits for /health to be 200
  - If NGROK_AUTHTOKEN is set, waits for /public-url to contain a URL
  - Otherwise, verifies /public-url returns a JSON with status (e.g., no-token)
  - Shuts the server down and exits with 0 on success, 1 on failure
*/

const http = require('http');
const path = require('path');

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function getJson(url, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({ statusCode: res.statusCode, json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, json: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); });
  });
}

async function pollHealth(timeoutMs = 15000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { statusCode } = await getJson('http://localhost:3000/health');
      if (statusCode === 200) return true;
    } catch (_) {}
    await sleep(intervalMs);
  }
  return false;
}

async function pollPublicUrl(requireUrl, timeoutMs = 30000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { json } = await getJson('http://localhost:3000/public-url');
      if (!json) { await sleep(intervalMs); continue; }
      if (requireUrl) {
        if (json.url) return { ok: true, url: json.url };
      } else {
        // no token required; any valid JSON is fine
        return { ok: true, url: json.url || null, status: json.status };
      }
    } catch (_) {}
    await sleep(intervalMs);
  }
  return { ok: false };
}

(async () => {
  const serverModulePath = path.join(__dirname, '..', 'server', 'index.js');
  const serverModule = require(serverModulePath);

  if (typeof serverModule.setLogger === 'function') {
    serverModule.setLogger((level, message) => {
      const prefix = String(level).toUpperCase();
      process.stdout.write(`[${prefix}] ${message}`);
    });
  }

  // Start server
  serverModule.startServer();
  console.log('[INFO] startServer() called');

  // Health check
  const healthy = await pollHealth();
  if (!healthy) {
    console.error('[ERROR] Health check failed: /health not ready');
    try { serverModule.server && serverModule.server.close(); } catch (_) {}
    process.exit(1);
  }
  console.log('[INFO] Health check passed');

  const requireNgrok = !!process.env.NGROK_AUTHTOKEN;
  const pub = await pollPublicUrl(requireNgrok);
  if (!pub.ok) {
    console.error('[ERROR] Public URL check failed');
    try { serverModule.server && serverModule.server.close(); } catch (_) {}
    process.exit(1);
  }
  if (requireNgrok && !pub.url) {
    console.error('[ERROR] NGROK token present but no URL detected');
    try { serverModule.server && serverModule.server.close(); } catch (_) {}
    process.exit(1);
  }

  console.log(`[INFO] Public URL check ${requireNgrok ? 'passed (URL required)' : 'passed (URL optional)'}: ${pub.url || '(none)'}`);

  // Shutdown
  try { serverModule.server && serverModule.server.close(); } catch (_) {}
  console.log('[INFO] Smoke test PASS');
  process.exit(0);
})();
