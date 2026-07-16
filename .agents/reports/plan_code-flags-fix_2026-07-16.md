# Plan: Fix 6 Code-Doc Discrepancy Flags
_Implement all 6 pending code fixes from `code-flags.md` without breaking the existing Web UI._

## Success
- [x] `apiKeyMiddleware` accepts `x-api-key` header and `api_key`/`apiKey` query params (match `verifySignedOrApiKey` pattern)
- [x] `POST /api/v1/sign-file` endpoint exists, accepts `{ filename, expiresIn }`, returns signed URL
- [x] `getMessages` route + controller support optional `userId` filter + `longPoll`/`timeout` params
- [x] `Message` schema has `@@index([botId, userId])` and `@@index([createdAt])`
- [x] `addMessageSingle` route applies `uploadLimiter` middleware
- [x] `getMessages` default limit changed from 20 to 50
- [x] Web UI continues to work unchanged
- [x] All existing tests pass

## Prerequisites
- Server code at `server/src/index.ts`, `server/src/controllers/messageController.ts`
- Prisma schema at `server/prisma/schema.prisma`
- Existing `verifySignedOrApiKey` at line 392 as reference pattern for multi-method auth
- Existing `uploadFile` route at line 623 as reference for `uploadLimiter` usage
- Existing `generateSignedUrl` helpers at lines 30-52 as reference for sign-file endpoint

## Scope
- Web UI (`web_ui/`) — deliberately not touched
- SDK docs (`docs/nsdks/`) — deliberately not touched (separate effort)
- Node SDK (`chatLayerSDK_node/`) — deliberately not touched

---

## Steps

### Step 1: Expand `apiKeyMiddleware` to support all three auth methods

Add `x-api-key` header check and `api_key`/`apiKey` query param checks to `apiKeyMiddleware`, matching the same logic used in `verifySignedOrApiKey` (lines 396-403).

- **Expected:** `apiKeyMiddleware` checks Authorization header first, then falls back to `x-api-key` header, then to `api_key`/`apiKey` query params.
- [x] Complete

### Step 2: Add `POST /api/v1/sign-file` endpoint

Add a new route that accepts `{ filename, expiresIn }` body, calls `generateSignedUrl`, and returns `{ success, url }`. Apply `apiKeyMiddleware` and `generalLimiter`.

- **Expected:** Clients can POST to `/api/v1/sign-file` to get a signed URL for any stored file.
- [x] Complete

### Step 3: Add `userId`, `longPoll`, `timeout` params to `getMessages`

- Extend `GetMessagesOptions` type in `messageController.ts` with optional `userId`, `longPoll`, `timeout` fields
- Extend the `getMessages` route handler in `index.ts` to read these query params
- Extend the controller `getMessages` to add `userId` filter to the Prisma `where` clause
- For `longPoll`/`timeout`: when `longPoll=true`, delegate to the long-poll manager instead of the direct DB query (use `longPoll.waitForMessages` for the specific botId)

- **Expected:** Callers can pass `?userId=X` to filter messages by user, `?longPoll=true&timeout=30000` to long-poll on getMessages directly.
- [x] Complete

### Step 4: Add missing indexes to Prisma schema

Add two index declarations to the `Message` model:
```prisma
@@index([botId, userId])
@@index([createdAt])
```

Then run `pnpm run db:push` (dev) to apply. Do NOT run a formal migration (SQLite doesn't require it for indexes).

- **Expected:** Schema has 3 indexes: `[botId, roomId]`, `[botId, userId]`, `[createdAt]`
- [x] Complete

### Step 5: Add `uploadLimiter` to `addMessageSingle` route

Add `uploadLimiter` as middleware between `apiKeyMiddleware` and `upload.array("file")` in the `addMessageSingle` route definition (line 852).

- **Expected:** `addMessageSingle` now rate-limited identically to `uploadFile` and `uploadFileByURL`.
- [x] Complete

### Step 6: Change `getMessages` default limit to 50

Change `take: opts.limit ?? 20` to `take: opts.limit ?? 50` in `messageController.ts` line 144.

- **Expected:** Default limit is now 50, consistent with `getRooms`.
- [x] Complete
