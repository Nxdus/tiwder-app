FROM node:24-bookworm-slim
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "bun run db:migrate && exec node dist/main.js"]
