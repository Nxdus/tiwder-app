# tiwder-app

## Backend (NestJS)

```sh
cd apps/backend
bun install
bun run start:dev
```

The backend runs at `http://localhost:3001`. Set `PORT` to override the port.
Run `bun run build`, `bun run test`, and `bun run test:e2e` from `apps/backend`.

## Coolify (Docker Compose)

Use the repository root as the base directory and `/docker-compose.yml` as the
Compose file. Assign the public HTTPS domain to `front` on container port `3000`;
`back` is reached internally at `http://back:3001` through the frontend API proxy.

Set `POSTGRES_PASSWORD` to a strong URL-safe password, `FRONTEND_URL` to the public
HTTPS origin, and `GOOGLE_REDIRECT_URI` to that origin plus
`/api/auth/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and
register the same callback in Google OAuth. The backend applies database
migrations before starting. Keep the PostgreSQL volume between deployments.

Build the containers locally with `docker compose build front back`.

## Local PostgreSQL

Start the database:

```sh
docker compose up -d postgres
```

Default connection URL:

```text
postgresql://tiwder:tiwder@localhost:5432/tiwder
```

These credentials are for local development. Override `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_PORT` through shell
environment variables or a local `.env` file.

Check status with `docker compose ps`. Stop with `docker compose down`;
the named volume preserves database data. `docker compose down -v` deletes it.

Credentials initialize an empty volume only; changing environment variables
does not update users or databases in an existing volume.
