# Cancellation preview — idea 1

Branch: `feature/cancellation-reason-card`

Cancel lesson → choose a reason → Continue → review → Confirm cancellation → success.

- Choose Schedule conflict, Personal reasons, Health reasons, or Other (required text, up to 300 characters).
- Both roles can cancel a future confirmed lesson. The reason is stored in the database and returned to both participants.
- Cancelled cards retain the original role-specific photo and card size. Only the name, schedule, cancellation status and reason are shown; contact information, biography, subject and price are hidden. Open a cancelled card to read the complete reason. There is no delete button.
- Student list cards use the same preview component as active cards: name, calendar/time rows and status badge. The full cancellation reason appears after opening the card so preview layout stays consistent.
- Cancelled requests appear only for the recipient: tutor Decline → Student Offered; student Withdraw or decline of a proposed time → Tutor Swiped. The initiating party no longer sees that request card. Records and reasons remain stored. Cancelled confirmed lessons still appear in both participants' Matched pages.
- No cancellation notification bell or notification delivery is included in this alternative.
- Existing cancelled lessons without a reason display “No reason provided”.

## Run locally

From `apps/backend`, run `bun run db:migrate` once, then `bun run start:dev`.
From `apps/frontend` in another terminal, run `bun run dev`.

Stop both dev servers with Ctrl+C before switching branches, then restart them. Do not undo migrations when switching these two alternatives: both use the same reason column. The additional notification table from idea 2 can stay in the local database and is simply unused by idea 1.

## Compare the alternatives

```powershell
git switch feature/cancellation-reason-card
# Idea 1: photo cards with cancellation reasons, no cancellation notifications.

git switch feature/cancellation-notifications
# Idea 2: regular cards with cancellation notifications.
```

Use two accounts in separate browser profiles (or a normal and an Incognito window). Create a local test lesson, cancel it from one account, and check Cancelled under Matched from both accounts. In idea 1, refresh the other account or return focus to its browser window to load the updated status. A cancellation changes the shared local database, so use a different test lesson when comparing the other branch.

These are alternative implementations, not two PRs to merge together. This preview has not been deployed to the live website.

## Validation

- Backend lint/build and 25 integration tests, including invalid/empty/long reasons, both cancellation roles, participant access and persistence. Request cancellation tests cover tutor decline, student withdrawal, and student decline of a time offer, with reasons visible to both parties only in the interest lists.
- Frontend ESLint and TypeScript checks.
- Browser interaction and production frontend build have not been verified.
