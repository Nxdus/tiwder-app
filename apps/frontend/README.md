# Tiwder frontend

Next.js frontend with Tailwind CSS and shadcn/ui. Start the configured NestJS backend on port 3001 before running the frontend.

```sh
bun install
bun run dev
```

Open http://localhost:3000. `/api/*` proxies to `BACKEND_URL` (default `http://localhost:3001`); Google credentials stay in the backend environment. Google OAuth returns to `/api/auth/google/callback`.

Visitors can browse completed tutor profiles. Google sign-in opens `/onboarding` to select a permanent student/tutor role and complete required profile fields. `/profile` allows later edits and logout. Student Offered/Matched tabs show real requests and lessons; tutors use `/tutor/swiped`, `/tutor/time-slot?request=<id>`, and `/tutor/matched`.

A student requests one subject, the tutor proposes a future Bangkok time in 30-minute increments, and the student confirms. Each participant can have only one confirmed unfinished lesson, even on different dates. Confirmation closes other pending requests. Either participant may cancel before the start; lessons complete after their end. Contact details are available only to confirmed partners. Payment and lesson arrangements happen outside Tiwder.

Active routes use the API and PostgreSQL. Legacy demo components/storage are no longer used by these routes; old anonymous IndexedDB records are not imported.

Feature UI is in `components/auth`, `components/bookings`, and `components/discover`; shared API types/client are in `lib/api.ts`. Existing components and styles are preserved where practical.

```sh
bun run lint
bunx tsc --noEmit
bun run build
```

Run backend security, permission, and concurrent booking tests with `bun run test:e2e` in `apps/backend`. They use a disposable PostgreSQL database and mock Google's external token exchange; live Google sign-in requires an authorized test account.
