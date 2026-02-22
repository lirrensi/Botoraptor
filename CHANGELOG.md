# Changelog

All notable changes to ChatLayer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

[3.1.0]: https://github.com/lirrensi/ChatLayer/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/lirrensi/ChatLayer/releases/tag/v3.0.0
