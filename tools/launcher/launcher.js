#!/usr/bin/env node
/**
 * Ashward launcher (Minecraft-style).
 * Checks GitHub Releases, downloads any version you pick, keeps old ones,
 * and launches the selected version in your browser.
 *
 * Usage:
 *   node launcher.js              # list versions, offer latest
 *   node launcher.js play         # play latest
 *   node launcher.js play v0.6.0  # play a specific version
 *   node launcher.js update       # download latest if missing
 *
 * Versions are stored in ~/.ashward/versions/
 * No AI tokens are used.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');

const OWNER = 'SporadicShade';
const REPO = 'sproutbound';
const VERSIONS_DIR = path.join(os.homedir(), '.ashward', 'versions');
const CURRENT_FILE = path.join(os.homedir(), '.ashward', 'current.txt');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ashward-launcher' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'ashward-launcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // Prefer system unzip; fall back to tar (GitHub also offers .tar.gz)
  try {
    execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
  } catch {
    try {
      execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'inherit' });
    } catch (e) {
      throw new Error('Could not extract archive. Install unzip or tar.');
    }
  }
}

async function listReleases() {
  const releases = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/releases`);
  return releases.map((r) => ({
    tag: r.tag_name,
    name: r.name || r.tag_name,
    published: r.published_at,
    zip: r.zipball_url,
  }));
}

function installedVersions() {
  if (!fs.existsSync(VERSIONS_DIR)) return [];
  return fs.readdirSync(VERSIONS_DIR).filter((d) => fs.statSync(path.join(VERSIONS_DIR, d)).isDirectory());
}

async function ensureVersion(tag) {
  const dir = path.join(VERSIONS_DIR, tag);
  if (fs.existsSync(path.join(dir, 'index.html'))) return dir;

  console.log(`Downloading ${tag}...`);
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  const zipPath = path.join(VERSIONS_DIR, `${tag}.zip`);
  const url = `https://github.com/${OWNER}/${REPO}/archive/refs/tags/${tag}.zip`;
  await download(url, zipPath);
  extractZip(zipPath, dir);
  // GitHub zip nests one folder; move contents up if needed
  const entries = fs.readdirSync(dir);
  if (entries.length === 1 && fs.statSync(path.join(dir, entries[0])).isDirectory()) {
    const nested = path.join(dir, entries[0]);
    for (const f of fs.readdirSync(nested)) {
      fs.renameSync(path.join(nested, f), path.join(dir, f));
    }
    fs.rmdirSync(nested);
  }
  fs.unlinkSync(zipPath);
  console.log(`Installed ${tag} to ${dir}`);
  return dir;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { shell: true, detached: true, stdio: 'ignore' }).unref();
}

function serve(dir, port = 8765) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
    if (!filePath.startsWith(dir)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(data);
    });
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`Serving ${dir} at ${url}`);
    openBrowser(url);
    console.log('Press Ctrl+C to stop the server.');
  });
}

async function main() {
  const [, , cmd = 'list', arg] = process.argv;
  fs.mkdirSync(path.dirname(VERSIONS_DIR), { recursive: true });

  if (cmd === 'list' || cmd === 'ls') {
    const releases = await listReleases();
    const installed = new Set(installedVersions());
    console.log('Available releases:');
    releases.forEach((r) => {
      const mark = installed.has(r.tag) ? '[installed]' : '';
      console.log(`  ${r.tag}  ${r.published?.slice(0, 10) || ''}  ${mark}`);
    });
    console.log('\nInstalled locally:');
    installedVersions().forEach((v) => console.log(`  ${v}`));
    return;
  }

  if (cmd === 'play' || cmd === 'update') {
    const releases = await listReleases();
    if (!releases.length) {
      console.error('No releases found. Push a version first so the release workflow can create one.');
      process.exit(1);
    }
    const tag = arg || releases[0].tag;
    const dir = await ensureVersion(tag);
    fs.writeFileSync(CURRENT_FILE, tag);
    if (cmd === 'play') serve(dir);
    else console.log(`Ready: ${tag}`);
    return;
  }

  console.log(`Usage:
  node launcher.js              list versions
  node launcher.js play         play latest
  node launcher.js play v0.6.0  play specific version
  node launcher.js update       download latest if missing`);
}

main().catch((e) => { console.error(e); process.exit(1); });
