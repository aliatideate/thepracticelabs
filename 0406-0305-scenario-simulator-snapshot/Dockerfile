# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY content ./content
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild esbuild
ENV NODE_ENV=production
ENV BASE_PATH=/
RUN pnpm --filter @workspace/scenario-simulator run build \
 && pnpm --filter @workspace/api-server run build
EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
