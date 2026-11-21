# Security Specification — MUNAF SHOP / মোনাফ টেলিকম (TallyKhata)

## 1. Data Invariants
1. A user can only read or write documents inside `/shops/{ownerUid}` where `request.auth != null && request.auth.uid == ownerUid`. Manual phone/email registrations use authenticated UID isolation, while platform admin operations (`isAdmin()`, `isSuperAdminEmail()`) strictly require `request.auth.token.email_verified == true`.
2. Every document must store `ownerUid == request.auth.uid`, immutable after creation.
3. All `createdAt` and `updatedAt` timestamps must strictly equal `request.time` (server timestamp).
4. A `khataEntries/{entryId}` write must reference an existing `contacts/{contactId}` document whose `updatedAt` is updated atomically in the same batch (`getAfter(...).data.updatedAt == request.time`).
5. All string fields enforce explicit `.size()` boundaries (`photoUrl` capped at `<= 60000` bytes, optional `branchId` capped at `<= 64` chars matching `isValidId`) and document IDs match `^[a-zA-Z0-9_\-]+$`.
6. No shadow/ghost fields are accepted on create (`hasOnly`) or update (`affectedKeys().hasOnly`).
7. Only verified platform admins (`email == "nahidulislamnahid357@gmail.com"` with `email_verified == true`, or listed in `/admins/{uid}`) may list all `/shops`, read `collectionGroup` `supportTickets` / `upgradeRequests`, approve `upgradeRequests`, or modify a shop's `planTier`.
8. Shop owners cannot self-assign `planTier != "free"` on create or tamper with `planTier`, `planBillingCycle`, `planStartedAt`, or `planExpiresAt` on update, nor can they mark their own `upgradeRequests` as `"active"`.
9. Only verified admins may write `adminReply`, `statusReason`, or `repliedAt` on `supportTickets` / `complaints` and `statusReason` / `updatedAt` on `upgradeRequests`.
10. Only verified admins may modify a shop's `accountStatus` (`active`, `blocked`, `banned`), `banReason`, `bannedAt`, or `bannedBy`. Blocked or banned shop owners cannot write ledger, cashbook, product, telecom, installment, purchaseOrder, staff, shiftClosing, branch, or upgrade documents, while still being able to read their own `shops/{ownerUid}` status and submit a support appeal ticket.
11. Only verified admins may create or update `/platformConfig/pricing` and `/platformConfig/gateways`; authenticated users may only read (`get`) them without any PII exposed.
12. `/platformConfig/appUpdate` contains strictly non-PII version metadata (`latestVersionName`, `latestVersionCode`, `minSupportedVersionCode`, `apkDownloadUrl`, `updateDescription`, `forceUpdate`, `publishedBy`, `updatedAt`), allows single-doc `get` so outdated clients see the mandatory update gate immediately on startup, and allows `create`/`update` strictly by `isSuperAdminEmail()` (the platform Owner) — sub-admins (`admins/{uid}`) cannot publish app updates.
13. Subcollections `branches`, `installments`, `purchaseOrders`, `staffMembers`, and `shiftClosings` follow strict tenant ownership (`isShopOwner(ownerUid)`), server-time `createdAt`/`updatedAt`, strict array size caps (`items.size() >= 1 && items.size() <= 50`), and terminal-state locking on `installments` once `status == 'completed'`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read**: `GET /shops/uid1/contacts/c1` or `GET /shops/uid1/installments/i1` without auth.
2. **Oversized photoUrl injection**: Creating a `Contact` or updating a `Shop` with `photoUrl` length > 60000 characters.
3. **Cross-tenant read/write**: User `uid2` attempts `GET /shops/uid1/staffMembers/s1` or `LIST /shops/uid1/purchaseOrders`.
4. **UID spoofing on create**: User `uid1` sets `ownerUid: "uid2"` inside `installments` or `branches` payload.
5. **Shadow/Ghost field injection**: Adding `isAdmin: true` or `extraField: "x"` on `create` or `update`.
6. **Client timestamp forgery**: Sending `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()`.
7. **Immutable field mutation**: Attempting to change `ownerUid` or `createdAt` on `update`.
8. **ID Poisoning**: Document ID > 128 chars or containing invalid characters (`../evil`).
9. **Orphaned KhataEntry**: Creating `khataEntries/{id}` with a non-existent `contactId` or without updating the parent contact in the same atomic batch.
10. **Negative or zero transaction amount**: `khataEntries`, `cashEntries`, `telecomEntries`, or `purchaseOrders` with `amount: -500` or `totalAmount: 0`, or terminal state tampering on completed `installments`.
11. **Oversized note / name (Denial of Wallet)**: `name` > 100 chars, `note` > 300 chars, `message` > 500 chars, or `purchaseOrders.items.size() > 50`.
12. **Privilege escalation / Sub-admin App Update hijack**: Non-admin user updating `shops/{uid}.planTier` to `'business'`, or a Sub-Admin (`admins/{uid}` with `email != 'nahidulislamnahid357@gmail.com'`) attempting to write `/platformConfig/appUpdate`.
