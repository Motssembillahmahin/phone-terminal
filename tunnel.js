const { spawn, execSync } = require('child_process');
const http = require('http');
const net = require('net');

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port, '127.0.0.1');
  });
}

function checkBinary(name) {
  try {
    execSync(`which ${name} 2>/dev/null || where ${name} 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

async function main() {
  console.log();
  console.log('  Phone Terminal — Remote Access');
  console.log('  ' + '-'.repeat(35));

  // Check if server is already running
  const inUse = await isPortInUse(PORT);
  if (inUse) {
    console.log(`  Server detected on port ${PORT}, skipping startup.`);
  } else {
    console.log(`  Starting server on port ${PORT}...`);
    require('./server');
    // Give server a moment to start
    await new Promise(r => setTimeout(r, 1000));
  }

  if (checkBinary('cloudflared')) {
    await startCloudflared();
  } else if (checkBinary('ngrok')) {
    await startNgrok();
  } else {
    console.log('  No tunnel binary found. Install one:');
    console.log('    cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
    console.log('    ngrok:       https://ngrok.com/download');
    console.log();
    process.exit(1);
  }
}

function startCloudflared() {
  return new Promise((resolve) => {
    console.log('  Starting Cloudflare Tunnel...');
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let urlFound = false;

    const handler = (data) => {
      const text = data.toString();
      // cloudflared wraps the URL in ASCII box; match it broadly
      const match = text.match(/https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = true;
        console.log(`  Public URL: ${match[0]}`);
        console.log(`  Auth:       ${AUTH_TOKEN ? 'token set ✓' : 'NONE — set AUTH_TOKEN for security'}`);
        console.log();
        console.log(`  Open this URL in your phone browser from anywhere.`);
        console.log();
      }
    };

    proc.stdout.on('data', handler);
    proc.stderr.on('data', handler);

    proc.on('exit', (code) => {
      if (!urlFound) {
        console.log('  cloudflared failed, trying ngrok...');
        resolve(startNgrok());
      } else {
        resolve();
      }
    });
  });
}

function startNgrok() {
  return new Promise((resolve) => {
    console.log('  Starting ngrok tunnel...');
    try { execSync('pkill -f "ngrok http" 2>/dev/null', { stdio: 'ignore' }); } catch {}

    const proc = spawn('ngrok', ['http', String(PORT), '--log=stdout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let urlFound = false;

    const handler = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.ngrok\.(?:io|app)/);
      if (match && !urlFound) {
        urlFound = true;
        console.log(`  Public URL: ${match[0]}`);
        console.log(`  Auth:       ${AUTH_TOKEN ? 'token set ✓' : 'NONE — set AUTH_TOKEN for security'}`);
        console.log();
        console.log(`  Open this URL in your phone browser from anywhere.`);
        console.log();
      }
    };

    proc.stdout.on('data', handler);
    proc.stderr.on('data', handler);

    proc.on('exit', (code) => {
      if (!urlFound) {
        console.log('  ngrok failed to start.');
        resolve();
      } else {
        resolve();
      }
    });
  });
}

main().catch(console.error);
