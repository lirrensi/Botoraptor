# Changelog

All notable changes to Botoraptor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.2.0] - 2026-07-16

### Added

- **Multi-method API key auth**: `apiKeyMiddleware` now accepts `x-api-key` header and `api_key`/`apiKey` query parameters in addition to `Authorization: Bearer` (matching the existing `verifySignedOrApiKey` pattern).
- **`POST /api/v1/sign-file` endpoint**: Generate signed URLs for stored files via public API.
- **`getMessages` long-polling mode**: Pass `?longPoll=true` to wait for new messages directly on the messages endpoint, with optional `userId` filter and `timeout` parameter.
- **Database indexes**: Added `@@index([botId, userId])` and `@@index([createdAt])` to Message schema for query performance.

### Fixed

- **`addMessageSingle` rate limiting**: Added missing `uploadLimiter` middleware to the route, aligning with `uploadFile` and `uploadFileByURL`.

### Changed

- **`getMessages` default limit**: Increased from 20 to 50 for consistency with `getRooms` pagination. Clients passing an explicit `limit` parameter are unaffected.
- **SDK documentation synced**: All four NSDK docs (Python, Node, Go, PHP) corrected to match actual code signatures, types, and defaults. Python Quick Start now uses correct `Message` object-based API.

---

## [3.1.0] - 2026-02-23

### Security

- **SSRF Protection**: Added protection against Server-Side Request Forgery in `uploadFileByURL` endpoint. Blocks requests to cloud metadata endpoints (AWS/GCP/Azure/Alibaba).
- **Rate Limiting**: Added rate limits to all API endpoints:
  - General: 100 requests/minute
  - Long-polling: 10 connections/minute
  - File uploads: 20 requests/minute
- **Security Headers**: Added Helmet middleware for security headers (X-Frame-Options, Content-Security-Policy, etc.)
- **CORS Configuration**: CORS now requires explicit origin configuration. Empty array = CORS disabled. See README for setup instructions.
- **Dangerous File Warnings**: Web UI now warns users about potentially dangerous file extensions (.exe, .bat, .ps1, etc.)

### Fixed

- **Memory Exhaustion**: `getRooms` endpoint now uses pagination (max 500 rooms) instead of loading all messages into memory.
- **N+1 Query**: Fixed N+1 query pattern in `getRooms` — users are now fetched in a single batch query.

### Changed

- **Documentation Reorganized**: All architecture docs consolidated into central `docs/` directory. Component-level `docs/` folders removed.
- **CORS Required for Cross-Origin**: Web UI hosted on a different domain now requires `corsOrigins` configuration in `server/config/server.json`.

### Added

- Root `.editorconfig` for consistent code style across editors
- Root `.env.example` documenting required environment variables
- `dangerousExtensions` field in client config

---

## [3.0.0] - 2026-02-XX

### Added

- Initial public release
- Server: Express.js + TypeScript + SQLite
- Web UI: Vue 3 + Ionic for manager interface
- Node SDK: TypeScript client for bots
- Python SDK: Async Python client for bots
- Docker support with docker-compose
- Long-polling for real-time updates
- Webhook support for external integrations
- File upload with signed URLs

---

## Upgrade Guide

### Upgrading to 3.1.0

1. **Pull latest changes**

2. **Install new dependencies** (server):
   ```bash
   cd server && pnpm install
   ```

3. **Configure CORS** (required if Web UI is on different domain):
   ```json
   // server/config/server.json
   {
     "corsOrigins": ["https://your-webui-domain.com"]
   }
   ```

4. **Rebuild Web UI** (if using):
   ```bash
   cd web_ui && pnpm run build
   ```

5. **Restart server**

---

[3.1.0]: https://github.com/lirrensi/Botoraptor/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/lirrensi/Botoraptor/releases/tag/v3.0.0
