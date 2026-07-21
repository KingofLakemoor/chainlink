# ChainLink Security Specification

## 1. Data Invariants
1. **User Identity Invariant**: A user document (`/users/{userId}`) can only be created or updated if the `request.auth.uid` matches the `userId`. The user cannot elevate their own role (`role` field must be `'USER'` on create, and left untouched on update).
2. **Matchup Invariant**: `Matchup` documents are read-only for normal users. They can only be modified by Admins.
3. **Picks Immutable Relationship**: A `Pick` document MUST reference a valid `matchupId`. Normal users can only create/update their own picks (`userId == request.auth.uid`). Once a pick is submitted, if the matchup `status` is not `PENDING`, the pick cannot be altered.
4. **Chains Autonomy**: A `Chain` can only jump up by strict rules (handled by cloud function/logic in practice, but rules protect the core). Only the owning user can modify their chain document or create it.
5. **Squad Membership Constraints**: A user can join an open squad (creating a `SquadMember` subdoc), but they cannot change other members' roles unless they are the OWNER.

## 2. The "Dirty Dozen" Payloads
Payloads designed to break the Identity, Integrity, and State:

1. **Identity Spoofing Write (Pick)**: User A tries to create a `Pick` under User B's `userId`.
2. **Privilege Escalation (User Update)**: User A sends an update to their `/users/{userId}` adding `"role": "ADMIN"`.
3. **Ghost Field Injection (Matchup)**: An admin tries to write a `Matchup` with an unauthorized `"isSecret": true` field (schema bypass).
4. **Terminal State Tampering (PickemPicks)**: A user tries to change their `Pick` after the matchup `startTime` or when its `status` is no longer `'PENDING'`.
5. **Denial of Wallet String Injection (Squads)**: A user sets a `Squad` description to a 2MB string.
6. **Cross-Tenant Write (CoinTransaction)**: User A tries to log a deposit for User B.
7. **Read-Scraping (Admin Collections)**: An unauthenticated user tries to `list` all `/users`.
8. **Owner Revocation (Squads)**: A `MEMBER` tries to kick the `OWNER` out of the squad.
9. **Fake Timestamp (Pick)**: User submits a pick with `createdAt` set to 3 days ago to enter a past matchup.
10. **Type Mismatch (Picks)**: User passes a boolean instead of an object for the `pick` field.
11. **Negative Coin Wagering**: User wagers `-500` coins to steal funds (handled by backend or logic, but negative wager fields should be rejected).
12. **Array Expansion Attack**: User tries to add 100,000 strings to `friends` array.

## 3. The Test Runner
A `firestore.rules.test.ts` file will be created to test these assertions against the rules emulator.
