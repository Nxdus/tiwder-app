# Tiwder backend

NestJS API with PostgreSQL and Drizzle ORM.

Copy `.env.example` to `.env` and set `DATABASE_URL`. Start PostgreSQL using the Docker Compose instructions in the root README.

```sh
bun install
bun run start:dev
```

Runs at http://localhost:3001 (`PORT` overrides it). No API routes are registered yet.

```sh
bun run lint
bun run build
bun run test
bun run test:e2e
```

Tests replace the database service and do not require PostgreSQL.

```sh
bun run db:generate
bun run db:migrate
bun run db:studio
```
