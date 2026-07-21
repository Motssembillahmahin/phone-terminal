const term = new Terminal({
  cursorBlink: true,
  cursorStyle: 'block',
  fontSize: 16,
  fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
  theme: {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    selectionBackground: '#33467c',
    black: '#1d202f',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

function getWsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}`;
}

let ws = null;
let reconnectTimer = null;

function connect() {
  const authScreen = document.getElementById('auth-screen');
  const container = document.getElementById('terminal-container');
  const status = document.getElementById('status');
  const reconnectBtn = document.getElementById('reconnect-btn');

  status.textContent = 'Connecting...';
  status.style.display = 'block';
  reconnectBtn.style.display = 'none';

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    // If auth token is stored, send it
    const token = localStorage.getItem('auth_token');
    if (token) {
      ws.send(JSON.stringify({ type: 'auth', token }));
    }
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'auth_required') {
      authScreen.style.display = 'flex';
      status.style.display = 'none';
      return;
    }

    if (msg.type === 'auth_ok') {
      authScreen.style.display = 'none';
      container.style.display = 'block';
      term.open(container);
      fitAddon.fit();
      term.focus();
      status.style.display = 'none';
      return;
    }

    if (msg.type === 'data') {
      // Ensure terminal is open
      if (!term.element) {
        authScreen.style.display = 'none';
        container.style.display = 'block';
        term.open(container);
        fitAddon.fit();
      }
      term.write(msg.data);
      status.style.display = 'none';
    }
  };

  ws.onclose = (e) => {
    status.textContent = 'Disconnected';
    status.style.display = 'block';
    reconnectBtn.style.display = 'block';
    term.dispose();
  };

  ws.onerror = () => {
    status.textContent = 'Connection error';
    status.style.display = 'block';
  };

  term.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });

  term.onResize(({ cols, rows }) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  });
}

// Auth form handler
document.getElementById('auth-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('token-input');
  const token = input.value.trim();
  if (!token) return;

  localStorage.setItem('auth_token', token);
  document.getElementById('auth-error').textContent = '';

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'auth', token }));
  } else {
    connect();
  }
});

// Handle resize
window.addEventListener('resize', () => {
  if (fitAddon) fitAddon.fit();
});

// Orientation change for mobile
screen.orientation && screen.orientation.addEventListener('change', () => {
  setTimeout(() => fitAddon.fit(), 300);
});

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

connect();
