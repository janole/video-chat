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
listens on port 4999 by default. Vite proxies `/socket.io` to the signaling
server, so the browser talks to a single origin in development and production
alike.

Run the same build, formatting, lint, and test gate used before committing:

```shell
pnpm run ok
```

CI runs the non-fixing variant, `pnpm qa`, on every push and pull request.

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
| `PEER_ICE_TRANSPORT_POLICY` | Set to `relay` to force all traffic through TURN | `all` |

### Frontend

The frontend needs no runtime configuration: it always connects to the
signaling server on its own origin.

Express gives hashed files under `/assets/` a one-year immutable cache policy.
It prevents caching of `index.html` and `manifest.json`, and serves
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

## Deployment

A complete Docker Compose deployment needs one service for the app and a
TLS-terminating reverse proxy in front of it. The example below uses Traefik;
any proxy that forwards websocket upgrades works. Add the coturn service from
the section above for NAT traversal.

```yaml
name: video-chat

services:
  app:
    image: ghcr.io/janole/video-chat:v2.0.1
    restart: unless-stopped
    environment:
      STUN_SERVERS: "stun:stun.video.example.com:3478"
      TURN_SERVERS: "turn:turn.video.example.com"
      TURN_SECRET: "${TURN_SECRET}"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.video-chat.rule=Host(`video.example.com`)"
      - "traefik.http.routers.video-chat.tls.certresolver=default"
      - "traefik.http.routers.video-chat.entrypoints=https"
      - "traefik.http.services.video-chat.loadbalancer.server.port=4999"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

Frontend, signaling, and the `/health` endpoint are all served by this one
container on port 4999, so a single hostname and certificate cover everything.
Images are published to GHCR by the release workflow whenever a git tag is
pushed; the image tag matches the git tag.
