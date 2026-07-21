# Phone Terminal

Web-based terminal accessible from any device. Control your PC from your phone — even when you're away from home.

No app installation needed on the client. Just a browser.

## Quick Start

```bash
npm install
npm start
```

Open **http://<your-pc-ip>:3000** on your phone browser (same WiFi).

## Remote Access (from anywhere)

### Option 1: Cloudflare Tunnel (recommended — free, no open ports)

```bash
# Install cloudflared (one-time)
# Linux:  https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
# macOS:  brew install cloudflared
# Windows: choco install cloudflared

# Start with tunnel
AUTH_TOKEN=your-secret npm run tunnel
```

A public `https://*.trycloudflare.com` URL is printed. Open it from anywhere.

### Option 2: ngrok (free tier)

```bash
# Install ngrok: https://ngrok.com/download

AUTH_TOKEN=your-secret npm run tunnel
```

A public `https://*.ngrok.io` URL is printed. Open it from anywhere.

### Option 3: SSH reverse tunnel

```bash
# If you have a VPS with SSH access
ssh -R 3000:localhost:3000 user@your-vps
```

Then access via `http://localhost:3000` on your VPS, or proxy with Nginx.

### Option 4: WireGuard VPN

Connect to your home VPN first, then use the local IP like you're on the same WiFi.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Web server port |
| `AUTH_TOKEN` | (none) | Require a password/token to access |
| `SHELL` | bash | Shell binary (e.g. `zsh`, `fish`) |

```bash
PORT=8080 AUTH_TOKEN=mysecret SHELL=/usr/bin/zsh npm start
```

## Security

- **Always set `AUTH_TOKEN` when exposing to the internet**
- The tunnel scripts auto-detect `AUTH_TOKEN` and show it in the console output
- Cloudflare Tunnel and ngrok both provide TLS automatically

## How It Works

```
Browser ──WebSocket──> server.js ──PTY──> Shell (bash/zsh)
```

- **xterm.js** renders the terminal in the browser
- **node-pty** spawns a real shell with a pseudo-terminal
- **ws** handles bidirectional communication
- **Express** serves the static frontend

## Prerequisites

- **Node.js 18+**
- Build tools for `node-pty`:
  - Linux: `build-essential` + `python3`
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools

## License

MIT
