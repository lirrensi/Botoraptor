# ChatLayer Server

Express.js + TypeScript server for real-time messaging with long-polling, webhooks, and file uploads.

## Quick Start

```bash
pnpm install
pnpm run db:push
cp .env.example .env  # Configure your env variables
pnpm run dev
```

Server runs on `http://localhost:3000` (configurable in `.env`)

## Common Commands

**Development**
- `pnpm run dev` - Start dev server with hot reload
- `pnpm run build` - Compile TypeScript
- `pnpm run typecheck` - Type check only

**Testing**
- `pnpm test:dev` - Run tests with tsx (recommended)
- `pnpm test` - Run compiled tests

**Database**
- `pnpm run generate` - Generate Prisma client
- `pnpm run db:push` - Push schema changes (dev)
- `pnpm run db:studio` - Open Prisma Studio

## Documentation

| Topic | File |
|-------|------|
| **Architecture** | `docs/ARCH.md` |
| **API Structure** | `docs/API_STRUCTURE.md` |
| **Data Models** | `docs/DATA_MODELS.md` |
| **Configuration** | `docs/CONFIGURATION.md` |
| **Database Setup** | `docs/DATABASE_SETUP.md` |
| **Database Flow** | `docs/DATABASE_FLOW.md` |
| **Long Polling** | `docs/LONG_POLLING.md` |
| **Long Polling Architecture** | `docs/ARCH_long-polling.md` |
| **Webhooks** | `docs/WEBHOOKS.md` |
| **Webhook Architecture** | `docs/ARCH_webhooks.md` |
| **File Handling** | `docs/FILE_HANDLING.md` |

## API Endpoints

- `GET /health` - Health check
- `GET /api-docs` - OpenAPI/Swagger documentation
- `POST /api/v1/addMessage` - Create a message
- `POST /api/v1/get-messages` - Fetch messages (supports long-polling)
- `POST /api/v1/upload-file` - Upload file with HMAC signature
- `POST /api/v1/sign-file` - Sign file URL for upload

See `docs/API_STRUCTURE.md` for full endpoint documentation.

## Key Features

- **Long-polling** - Real-time message delivery with role-based routing
- **Webhooks** - Async event dispatch to configured endpoints
- **File uploads** - HMAC-signed uploads with local storage
- **SQLite + Prisma** - Type-safe database operations
- **TypeScript** - Full type safety with strict mode

## Project Structure

```
src/
├── index.ts              # Express app & routes
├── prismaClient.ts       # Prisma client singleton
├── swagger.ts            # OpenAPI config
├── controllers/          # Business logic
└── helpers/              # Utilities (long-poll, webhooks)
```

## Code Style

- 4-space indentation, double quotes
- ES modules, semicolons required
- Strict TypeScript with local types in controllers
- Consistent error handling with `sendSuccess()`/`sendError()`

See `AGENTS.md` for detailed coding guidelines.