# ChatLayer Server

Express.js + TypeScript server with SQLite, long-polling, webhooks, and file uploads.

## Quick Start

```bash
pnpm install
pnpm run generate    # Generate Prisma client
pnpm run db:push     # Initialize database
pnpm run dev
```

Server runs on `http://localhost:31000`

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start with hot reload |
| `pnpm run build` | Compile TypeScript |
| `pnpm test:dev` | Run tests |
| `pnpm run db:studio` | Open Prisma Studio |

## Configuration

Edit `config/server.json`:

```json
{
  "port": 31000,
  "apiKeys": ["your-secret-key"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800
}
```

Set environment variable:

```bash
FILE_SIGNING_SECRET=your-secret-key
```

## Documentation

- **Architecture & API**: [docs/arch_server.md](../docs/arch_server.md)
- **Product Spec**: [docs/product.md](../docs/product.md)

## Project Structure

```
src/
├── index.ts              # Express app & routes
├── controllers/          # Business logic
└── helpers/              # Long-poll, utilities
```

See [AGENTS.md](AGENTS.md) for coding guidelines.
