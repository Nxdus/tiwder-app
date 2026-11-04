# tiwder-app

## Backend (NestJS)

```sh
cd apps/backend
bun install
bun run start:dev
```

The backend runs at `http://localhost:3001`. Set `PORT` to override the port.
Run `bun run build`, `bun run test`, and `bun run test:e2e` from `apps/backend`.

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
