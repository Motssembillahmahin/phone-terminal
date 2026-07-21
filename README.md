# Phone Terminal

Turn your PC into a web-based terminal server. Access a full terminal from any device — phone, tablet, or another computer — right from the browser.

No app installation needed on the client. Just a browser.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://<your-pc-ip>:3000** on your phone browser.

## Configuration

All config is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Web server port |
| `AUTH_TOKEN` | (none) | Set this to require a password/token |
| `SHELL` | bash | Shell binary path (e.g. `zsh`, `fish`) |

### Examples

```bash
# Custom port
PORT=8080 npm start

# With password protection
AUTH_TOKEN=mysecret npm start

# Custom shell
SHELL=/usr/bin/zsh npm start
```

## Security

- By default, accessible to **anyone on your local network**
- Use `AUTH_TOKEN` to restrict access
- **Do not expose to the public internet** without a reverse proxy with TLS (e.g. Nginx + Let's Encrypt, Caddy, or Cloudflare Tunnel)
- For internet access, wrap it in SSH tunnel: `ssh -L 3000:localhost:3000 user@your-server`

## How It Works

```
Phone Browser  ──WebSocket──>  server.js  ──PTY──>  Shell (bash/zsh/etc)
```

- **xterm.js** renders the terminal in the browser
- **node-pty** spawns a real shell with a pseudo-terminal
- **ws** handles bidirectional real-time communication
- **Express** serves the static frontend

## Platform Support

| Platform | Status |
|----------|--------|
| Linux | ✅ Full support |
| macOS | ✅ Full support |
| Windows | ✅ Requires `node-pty` build tools (vs build tools) |

### Prerequisites

- **Node.js 18+**
- **npm**
- Build tools for `node-pty` (prebuilt binaries may not be available for all platforms):
  - Linux: `build-essential` + `python3`
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools

## License

MIT
