# video-chat

A simple video chat demo based on React and WebRTC.

## Requirements

- Node.js 22 or newer
- pnpm 10.33.3

## Development

Install the frontend and backend workspace dependencies:

```shell
pnpm install
```

Start the Vite frontend and signaling server together:

```shell
pnpm run dev
```

The frontend is available at <http://localhost:5173> and the signaling server
listens on port 4999 by default. The development `env.js` points the browser at
`ws://localhost:4999`; Socket.IO uses its default `/socket.io` path.

Run the same build, formatting, lint, and test gate used before committing:

```shell
pnpm run ok
```

The production frontend bundle is written to `frontend/dist/`, and the backend
build is written to `backend/dist/`.

Build the single production image from the repository root:

```shell
docker build -t video-chat .
```

The image exposes port 4999. One Express server serves the frontend, health API,
SPA fallback, and Socket.IO endpoint. Production deployments should terminate
TLS in front of this container so Socket.IO uses WSS. Browsers also require a
secure HTTPS context for camera and microphone access outside localhost.

## Configuration

### Backend signaling server

Configure the backend with environment variables:

| Name | Description | Default |
| --- | --- | --- |
| `LISTEN_PORT` | Express and Socket.IO server port | `4999` |
| `FRONTEND_DIST` | Path to the built frontend served by Express | `../frontend/dist` |
| `TURN_SERVERS` | Comma-separated TURN server URLs, such as `turn:server.com` | None |
| `TURN_SECRET` | Shared secret for TURN REST credentials | None |
| `STUN_SERVERS` | Comma-separated STUN server URLs, such as `stun:server.com` | None |

### Frontend

Runtime frontend configuration lives in `frontend/public/env.js`. For the
container image, mount a replacement at `/usr/src/app/frontend/dist/env.js`.
Set `SIGNAL_SERVER` to an empty string for the normal same-origin production
setup, or to an explicit signaling-server URL when needed. The committed value
is `ws://localhost:4999` so `pnpm run dev` works without extra configuration.

Express gives hashed files under `/assets/` a one-year immutable cache policy.
It prevents caching of `index.html`, `env.js`, and `manifest.json`, and serves
`index.html` for non-API deep links such as `/call/example-room`. The health
endpoint is available at `/health`, and Socket.IO uses `/socket.io`.

### STUN/TURN server setup with coturn

One option is the [instrumentisto/coturn](https://hub.docker.com/r/instrumentisto/coturn)
container:

```yaml
services:
  coturn:
    image: instrumentisto/coturn
    network_mode: host
    volumes:
      - "./coturn:/var/lib/coturn"
    command: ["-a", "-f", "--realm=videochat", "--log-file=stdout", "--min-port=49160", "--max-port=49200", "--external-ip=$$(detect-external-ip)", "--use-auth-secret", "--static-auth-secret=the-turn-secret-see-above"]
```

- Open the configured UDP range in the firewall. The example uses
  ports 49160-49200.
- Set `TURN_SECRET` on the signaling server to the same value as coturn's
  `--static-auth-secret`.
