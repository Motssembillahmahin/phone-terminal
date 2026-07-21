const { spawn, execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Start the terminal server first
const server = require('./server');

function checkBinary(name) {
  try {
    execSync(`which ${name} 2>/dev/null || where ${name} 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function waitForServer(url, cb, attempt = 0) {
  if (attempt > 30) return cb(new Error('timeout'));
  const req = http.get(url, (res) => { res.resume(); cb(null); });
  req.on('error', () => {
    setTimeout(() => waitForServer(url, cb, attempt + 1), 500);
  });
  req.end();
}

function startCloudflared() {
  console.log('  Starting Cloudflare Tunnel...');
  const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const handler = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      console.log(`  Public URL: ${url}`);
      console.log(`  Auth:       ${AUTH_TOKEN ? 'token required' : 'none'}`);
      console.log();
      console.log(`  Open this URL in your phone browser from anywhere.`);
      console.log();
    }
  };

  proc.stdout.on('data', handler);
  proc.stderr.on('data', handler);

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.log('  cloudflared failed, trying ngrok...');
      startNgrok();
    }
  });

  return proc;
}

function startNgrok() {
  console.log('  Starting ngrok tunnel...');
  try { execSync('pkill -f "ngrok http" 2>/dev/null', { stdio: 'ignore' }); } catch {}

  const proc = spawn('ngrok', ['http', String(PORT), '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const handler = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9]+\.ngrok\.(?:io|app)/);
    if (match) {
      console.log(`  Public URL: ${match[0]}`);
      console.log(`  Auth:       ${AUTH_TOKEN ? 'token required' : 'none'}`);
      console.log();
      console.log(`  Open this URL in your phone browser from anywhere.`);
      console.log();
    }
  };

  proc.stdout.on('data', handler);
  proc.stderr.on('data', handler);

  proc.on('exit', (code) => {
    if (code !== 0) console.log('  ngrok failed to start.');
  });

  return proc;
}

setTimeout(() => {
  const http = require('http');
  console.log('  ' + '-'.repeat(35));

  if (checkBinary('cloudflared')) {
    startCloudflared();
  } else if (checkBinary('ngrok')) {
    startNgrok();
  } else {
    console.log('  No tunnel binary found.');
    console.log('  Install one of:');
    console.log('    cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
    console.log('    ngrok:       https://ngrok.com/download');
    console.log();
    console.log('  Or use SSH tunnel:');
    console.log('    ssh -R 3000:localhost:3000 user@vps');
    console.log();
    process.exit(1);
  }
}, 1000);
