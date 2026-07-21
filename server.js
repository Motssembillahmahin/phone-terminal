const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const path = require('path');
const pty = require('node-pty');

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const SHELL = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    shell = pty.spawn(SHELL, [], {
      name: 'xterm-color',
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
  console.log();
  console.log('  Phone Terminal');
  console.log('  ' + '-'.repeat(30));
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}`);
  if (AUTH_TOKEN) {
    console.log(`  Auth:    token required`);
  }
  console.log('  ' + '-'.repeat(30));
  console.log();
});
