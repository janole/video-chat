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
listens on port 4999 by default.

Run the same build, formatting, lint, and test gate used before committing:

```shell
pnpm run ok
```

The production frontend bundle is written to `frontend/dist/`.

## Configuration

### Backend signaling server

Configure the backend with environment variables:

| Name | Description | Default |
| --- | --- | --- |
| `LISTEN_PORT` | Socket.IO signaling-server port | `4999` |
| `TURN_SERVERS` | Comma-separated TURN server URLs, such as `turn:server.com` | None |
| `TURN_SECRET` | Shared secret for TURN REST credentials | None |
| `STUN_SERVERS` | Comma-separated STUN server URLs, such as `stun:server.com` | None |

### Frontend

Runtime frontend configuration lives in `frontend/public/env.js`. For the
container image, mount a replacement at
`/usr/local/apache2/htdocs/env.js` when deployment-specific signaling settings
are needed.

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
