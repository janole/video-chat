FROM node:22-slim AS build

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts ./frontend/
COPY backend/package.json backend/tsconfig.json ./backend/

RUN pnpm install --frozen-lockfile

COPY frontend/ ./frontend/
COPY backend/ ./backend/

RUN pnpm run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV FRONTEND_DIST=/usr/src/app/frontend/dist
ENV LISTEN_PORT=4999

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --prod --frozen-lockfile --filter video-chat-backend...

COPY --from=build /usr/src/app/backend/dist ./backend/dist
COPY --from=build /usr/src/app/frontend/dist ./frontend/dist

EXPOSE 4999

WORKDIR /usr/src/app/backend

CMD ["node", "dist/server.js"]
