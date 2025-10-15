import express from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 17821;

// 👇 set this to your app's origin(s)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://main--activations-da--adobedevxsc.aem.page',
  'https://main--activations-da--adobedevxsc.aem.live'
];

// your existing config
const ALLOW_ROOT = '/Users/Shared';
const ILLUSTRATOR_APP = 'com.adobe.Illustrator';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin'); // important for caching proxies
    res.header('Access-Control-Allow-Credentials', 'true'); // only if you need cookies
  }
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  // If your page is HTTPS and you’re calling 127.0.0.1, most browsers allow it.
  // No extra header needed unless hitting a private LAN IP (PNA).
  if (req.method === 'OPTIONS') return res.sendStatus(204); // <-- preflight response
  next();
});

app.use(express.json());

function openInIllustrator(filePath) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/open', ['-b', ILLUSTRATOR_APP, filePath], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

app.post('/open', async (req, res) => {
  try {
    let { path: filePath } = req.body;
    if (!filePath) throw new Error('Missing path');
    filePath = path.resolve(filePath);
    if (!filePath.startsWith(ALLOW_ROOT)) throw new Error(`Path not allowed (must be inside ${ALLOW_ROOT})`);
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    await openInIllustrator(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () =>
  console.log(`🟢 Illustrator opener on http://127.0.0.1:${PORT}`)
);
