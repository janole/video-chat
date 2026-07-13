FROM node:22-slim AS build

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/tsconfig.json ./backend/

RUN pnpm install --frozen-lockfile --filter video-chat-backend...

COPY backend/peer-config.ts backend/server.ts ./backend/

RUN pnpm --filter video-chat-backend run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --prod --frozen-lockfile --filter video-chat-backend...

WORKDIR /usr/src/app/backend

COPY --from=build /usr/src/app/backend/dist ./dist

EXPOSE 4999

CMD ["node", "dist/server.js"]
