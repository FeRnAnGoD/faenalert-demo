FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter faenalert-frontend...
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter faenalert-frontend build
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/faenalert/browser /usr/share/nginx/html
EXPOSE 8080
