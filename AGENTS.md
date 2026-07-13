# AGENTS.md

## Quality Gate

Before finishing any code, package metadata, test, or behavior-affecting change,
run:

```bash
pnpm run ok  # => build + lint:fix + test
```

## Package Overview

- `frontend` - WebRTC client built with Vite 8, React 19, TypeScript, and MUI 9.
- `backend` - Minimal Express and Socket.IO signaling server.

## Architecture Guardrails

- Keep the signaling server minimal. Media remains a peer-to-peer mesh within
  each room.
- Deliver signaling messages to their explicit `to` target. The server must set
  `from` from `socket.id`; never trust a client-supplied sender identity.
- Preserve the security baseline: validate payloads, limit room size, and rate
  limit signaling traffic.
- Keep tests off the live network. Use fixtures and injected mocks.
- Do not add product behavior while changing tooling or framework scaffolding.

## Style

- TypeScript strict mode is authoritative.
- Follow `eslint.config.js`: Allman braces, 4-space indent, double quotes,
  semicolons, sorted imports, kebab-case filenames, and no explicit `any`.
- Prefer explicit, small functions over speculative abstractions.
- Keep comments concise and focused on non-obvious intent.

## Documentation

- Keep the README and committed documentation self-contained.
- Update setup instructions when runtime or package-manager requirements change.

`frontend/src/components/Video.js` remains a class component until a later
phase. Frontend `allowJs` is temporary and exists only to support that migration
boundary.
