const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const pty = require('node-pty');

// Load .env file if it exists
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const SHELL = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');

// Use tmux for persistent sessions if available
function getShellCmd() {
  const shell = SHELL;
  if (os.platform() === 'win32') return { cmd: shell, args: [] };
  try {
    execSync('which tmux', { stdio: 'ignore' });
    return { cmd: 'tmux', args: ['new-session', '-A', '-s', 'phone-terminal'] };
  } catch {
    return { cmd: shell, args: [] };
  }
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Heartbeat ping every 30s to detect stale connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  let authenticated = !AUTH_TOKEN;
  let shell = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'auth') {
        if (msg.token === AUTH_TOKEN) {
          authenticated = true;
          ws.send(JSON.stringify({ type: 'auth_ok' }));
          startShell();
        } else {
          ws.close(4001, 'Invalid token');
        }
        return;
      }

      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'auth_required' }));
        return;
      }

      if (msg.type === 'input' && shell) {
        shell.write(msg.data);
      } else if (msg.type === 'resize' && shell) {
        shell.resize(msg.cols, msg.rows);
      }
    } catch (e) {
      // ignore bad messages
    }
  });

  function startShell() {
    const { cmd, args } = getShellCmd();
    shell = pty.spawn(cmd, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    shell.onData((data) => {
      try {
        ws.send(JSON.stringify({ type: 'data', data }));
      } catch (e) {}
    });

    shell.onExit(() => {
      try { ws.close(); } catch (e) {}
    });

    ws.on('close', () => {
      if (shell) shell.kill();
    });
  }

  // If no auth required, start shell immediately
  if (!AUTH_TOKEN) {
    authenticated = true;
    startShell();
  } else {
    ws.send(JSON.stringify({ type: 'auth_required' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  const { cmd } = getShellCmd();
  console.log();
  console.log('  Phone Terminal');
  console.log('  ' + '-'.repeat(30));
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}`);
  console.log(`  Session: ${cmd === 'tmux' ? 'persistent (tmux)' : 'ephemeral'}`);
  if (AUTH_TOKEN) {
    console.log(`  Auth:    token required`);
    console.log(`  Token:   ${AUTH_TOKEN}`);
  }
  console.log('  ' + '-'.repeat(30));
  console.log();
});
