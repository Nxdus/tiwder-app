# Tiwder backend

The NestJS API runs on port 3001 under `/api`. Browsers access it through the Next.js app at `http://localhost:3000`.

1. Copy `.env.example` to `.env` and configure PostgreSQL and a Google OAuth **Web application** client. Store its client ID and secret only in the backend environment.
2. Register `http://localhost:3000/api/auth/google/callback` as the client's redirect URI. Use the origin configured in `FRONTEND_URL` when opening the frontend.
3. Run the following commands in this directory.

```sh
bun install
bun run db:migrate
bun run start:dev
```

Migrations seed the subject catalog. Students and tutors appear after Google sign-in and onboarding. The browser uses a seven-day HttpOnly session cookie. Authenticated writes require the configured frontend Origin and the session's `X-CSRF-Token`.

```sh
bun run build
bun run lint
bun run test
bun run test:e2e
```

The end-to-end suite uses the PostgreSQL server configured in `DATABASE_URL`. Its database user needs permission to create a disposable database. The suite migrates and removes only its own random test database and mocks the external Google token exchange.
