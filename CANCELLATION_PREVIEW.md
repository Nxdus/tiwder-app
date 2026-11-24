# Cancellation preview — idea 1

Branch: `feature/cancellation-reason-card`

Cancel lesson → choose a reason → Continue → review → Confirm cancellation → success.

- Choose Schedule conflict, Personal reasons, Health reasons, or Other (required text, up to 300 characters).
- Both roles can cancel a future confirmed lesson. The reason is stored in the database and returned to both participants.
- Cancelled cards show only Cancelled status, the other participant's name, the lesson date/time, and the reason. Profile pictures, contact information, biography, pricing and booking actions are omitted from these cancelled cards.
- No cancellation notification bell or notification delivery is included in this alternative.
- Existing cancelled lessons without a reason display “No reason provided”.

## Run locally

From `apps/backend`, run `bun run db:migrate` once, then `bun run start:dev`.
From `apps/frontend` in another terminal, run `bun run dev`.

Stop both dev servers with Ctrl+C before switching branches, then restart them. Do not undo migrations when switching these two alternatives: both use the same reason column. The additional notification table from idea 2 can stay in the local database and is simply unused by idea 1.

## Compare the alternatives

```powershell
git switch feature/cancellation-reason-card
# Idea 1: compact cancelled cards, no cancellation notifications.

git switch feature/cancellation-notifications
# Idea 2: regular cards with cancellation notifications.
```

Use two accounts in separate browser profiles (or a normal and an Incognito window). Create a local test lesson, cancel it from one account, and check Cancelled under Matched from both accounts. In idea 1, refresh the other account or return focus to its browser window to load the updated status. A cancellation changes the shared local database, so use a different test lesson when comparing the other branch.

These are alternative implementations, not two PRs to merge together. This preview has not been deployed to the live website.

## Validation

- Backend lint/build and 24 integration tests, including invalid/empty/long reasons, both cancellation roles, participant access and persistence.
- Frontend ESLint and TypeScript checks.
- Browser interaction and production frontend build have not been verified.
