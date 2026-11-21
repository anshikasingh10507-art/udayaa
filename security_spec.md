# Udaya Firestore Security Specification

## Phase 0: Data Invariants & Access Matrix

### Collections & Ownership
1. `/users/{userId}`
   - **Owner**: `request.auth.uid == userId`
   - **Read**: `get` allowed for `isOwner(userId) || isAdmin()`; `list` allowed ONLY for `isAdmin()` (prevents PII scraping of emails).
   - **Create**: `isOwner(userId)` with `role in ['renter', 'owner']` (or `isAdmin()`). `uid == userId`, `createdAt == request.time`, `updatedAt == request.time`.
   - **Update**: `isOwner(userId)` with immutable `uid`, `role`, `createdAt`; `updatedAt == request.time`. Admins may update `role`.
   - **Delete**: `isAdmin()` only.

2. `/users/{userId}/savedEquipment/{equipmentId}`
   - **Master Gate**: Parent `/users/{userId}` must exist.
   - **Read**: `get` allowed for `isOwner(userId) || isAdmin()`. `list` allowed for `isAdmin() || (isOwner(userId) && resource.data.userId == request.auth.uid)`.
   - **Create**: `isOwner(userId)` with valid schema, `userId == userId`, `savedAt == request.time`.
   - **Update**: `isOwner(userId)` with immutable `userId`, `equipmentId`, `savedAt`.
   - **Delete**: `isOwner(userId) || isAdmin()`.

3. `/users/{userId}/chatSessions/{sessionId}`
   - **Master Gate**: Parent `/users/{userId}` must exist.
   - **Read**: `get` for `isOwner(userId) || isAdmin()`; `list` checks `resource.data.userId == request.auth.uid || isAdmin()`.
   - **Create/Update/Delete**: Strictly `isOwner(userId)` (or `isAdmin()` for delete), immutable `userId` and `createdAt`, `updatedAt == request.time`.

4. `/users/{userId}/chatSessions/{sessionId}/messages/{messageId}`
   - **Master Gate**: Parent `/users/{userId}/chatSessions/{sessionId}` must exist.
   - **Read**: `get` for `isOwner(userId) || isAdmin()`; `list` checks `resource.data.userId == request.auth.uid || isAdmin()`.
   - **Create**: `isOwner(userId)` with `userId == userId`, `sessionId == sessionId`, `createdAt == request.time`.
   - **Update**: Denied (`false`) — chat history messages are immutable.
   - **Delete**: `isOwner(userId) || isAdmin()`.

5. `/users/{userId}/siteNotes/{noteId}`
   - **Master Gate**: Parent `/users/{userId}` must exist.
   - **Read/Create/Update/Delete**: Strictly `isOwner(userId) || isAdmin()`, immutable `userId` & `createdAt`, `updatedAt == request.time`.

6. `/admins/{userId}`
   - Strictly `isAdmin()` for read and write. Bootstrapped admin email: `anshikasingh10507@gmail.com` (requires `email_verified == true`).

## Dirty Dozen Attack Payloads (Must All Be Denied)
1. **Unauthenticated read/write**: Anonymous request reading `/users/alice` or creating `/users/alice/savedEquipment/1`.
2. **Cross-tenant read**: Authenticated `bob` reading `/users/alice/chatSessions/s1`.
3. **Self-promotion / Privilege escalation**: Authenticated `bob` creating `/users/bob` with `role: "admin"` or updating `role` from `"renter"` to `"admin"`.
4. **Field injection / pollution**: Creating `SavedEquipment` with extra undeclared field `adminOverride: true`.
5. **Oversized string DoS**: Creating `SiteNote` with `note` length > 1500 chars or `ChatMessage` with `text` > 12000 chars.
6. **Timestamp spoofing**: Creating `ChatMessage` with backdated `createdAt` instead of `request.time`.
7. **Ownership hijacking on update**: Updating `SiteNote.userId` to another UID.
8. **Type confusion**: Setting `SavedEquipment.dailyRate` to `"9999"` (string) or `-50` (negative number).
9. **Collection-wide PII enumeration**: Non-admin issuing `list` on `/users`.
10. **Orphaned subcollection write**: Creating `/users/bob/savedEquipment/1` when `/users/bob` does not exist.
11. **Mutating immutable chat logs**: Calling `update` on `/users/bob/chatSessions/s1/messages/m1`.
12. **Unbounded path / invalid ID**: Document ID containing disallowed characters or exceeding 128 chars.
