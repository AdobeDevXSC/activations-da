// ai-opener.js
import express from "express";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 17821;
// Adjust these for your setup:
const ILLUSTRATOR_APP = "/Applications/Adobe Illustrator 2025/Adobe Illustrator 2025.app";
const ALLOW_ROOT = "/Users/Shared";  // safety: only allow files under this folder

const app = express();
app.use(express.json());

function openInIllustrator(filePath) {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/open", ["-a", ILLUSTRATOR_APP, filePath], (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

app.post("/open", async (req, res) => {
  try {
    let p = req.body?.path;
    if (!p) throw new Error('Missing "path"');
    p = path.resolve(p);
    if (!p.startsWith(ALLOW_ROOT)) throw new Error("Path not allowed");
    if (!fs.existsSync(p)) throw new Error("File not found");
    await openInIllustrator(p);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => console.log(`AI opener on http://127.0.0.1:${PORT}`));
