# Database Initialization Flow

## Development vs Production Database Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE INITIALIZATION                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   DEVELOPMENT    │         │    PRODUCTION    │
│                  │         │                  │
│  NODE_ENV=dev    │         │ NODE_ENV=prod    │
│  (or unset)      │         │                  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│   db/dev.db      │         │   db/main.db     │
│                  │         │                  │
│  - Local testing │         │  - Live data     │
│  - Frequent      │         │  - Stable        │
│    changes       │         │  - Backed up     │
└──────────────────┘         └──────────────────┘
```

## Command Flow

### Development Initialization

```bash
pnpm migrate:dev
│
├─→ Reads: .env (NODE_ENV not set → defaults to "dev")
│
├─→ Resolves: DATABASE_URL="file:./db/dev.db"
│
├─→ Creates: db/dev.db (if not exists)
│
├─→ Runs: prisma/migrations/*.sql
│
├─→ Updates: prisma/migrations/migration_lock.toml
│
└─→ Result: ✅ Development database ready
```

### Production Initialization

```bash
pnpm migrate:prod
│
├─→ Sets: NODE_ENV=production
│
├─→ Reads: .env
│
├─→ Resolves: DATABASE_URL="file:./db/main.db"
│
├─→ Creates: db/main.db (if not exists)
│
├─→ Runs: prisma/migrations/*.sql
│
├─→ Updates: prisma/migrations/migration_lock.toml
│
└─→ Result: ✅ Production database ready
```

## Database File Structure

```
server/
├── .env                                    # Environment configuration
│   └─ DATABASE_URL="file:./db/${NODE_ENV:-dev}.db"
│
├── db/                                     # Database directory
│   ├── dev.db                              # Development database
│   ├── dev.db-journal                      # SQLite temp file (dev)
│   ├── main.db                             # Production database
│   └── main.db-journal                     # SQLite temp file (prod)
│
└── prisma/
    ├── schema.prisma                       # Database schema
    ├── migrations/                         # Migration files
    │   ├── 20260129091635_123/
    │   │   └─ migration.sql
    │   └─ migration_lock.toml
    └── seed.ts                             # Seeding script
```

## Environment Resolution

```
┌─────────────────────────────────────────────────────────────┐
│  .env Configuration                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATABASE_URL="file:./db/${NODE_ENV:-dev}.db"              │
│                                                             │
│  ┌─────────────────┬──────────────────────────────────┐   │
│  │ NODE_ENV Value  │  Resolved DATABASE_URL           │   │
│  ├─────────────────┼──────────────────────────────────┤   │
│  │ (not set)       │  file:./db/dev.db                │   │
│  │ ""              │  file:./db/dev.db                │   │
│  │ "dev"           │  file:./db/dev.db                │   │
│  │ "development"   │  file:./db/development.db        │   │
│  │ "production"    │  file:./db/main.db               │   │
│  │ "prod"          │  file:./db/prod.db               │   │
│  └─────────────────┴──────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Migration vs Push

### Migrate (Recommended for Production)

```
┌─────────────────────────────────────────────────────────┐
│  pnpm migrate:dev / pnpm migrate:prod                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Maintains migration history                         │
│  ✅ Can rollback to previous versions                   │
│  ✅ Tracks schema changes over time                     │
│  ✅ Production-safe                                     │
│  ⚠️  Slower (creates migration files)                   │
│                                                         │
│  Use when:                                              │
│  - Deploying to production                              │
│  - Need to track schema changes                         │
│  - Working with a team                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Push (Good for Development)

```
┌─────────────────────────────────────────────────────────┐
│  pnpm db:push:dev / pnpm db:push:prod                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Fast (no migration files)                           │
│  ✅ Great for rapid prototyping                         │
│  ✅ Simple workflow                                     │
│  ❌ No migration history                                │
│  ❌ Cannot rollback                                     │
│  ⚠️  Not recommended for production                     │
│                                                         │
│  Use when:                                              │
│  - Rapid development                                    │
│  - Local testing                                        │
│  - Schema changes are temporary                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Typical Workflows

### Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Initial Setup                                        │
├─────────────────────────────────────────────────────────┤
│  $ pnpm generate                                         │
│  $ pnpm migrate:dev                                     │
│  $ pnpm db:seed:dev                                     │
│  $ pnpm dev                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  2. Making Schema Changes                                │
├─────────────────────────────────────────────────────────┤
│  $ # Edit prisma/schema.prisma                          │
│  $ pnpm db:push:dev  # Fast, no migration               │
│  $ pnpm dev                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  3. Preparing for Production                            │
├─────────────────────────────────────────────────────────┤
│  $ pnpm migrate:dev --name feature_name                 │
│  $ # Test thoroughly                                    │
│  $ git commit migrations/                               │
└─────────────────────────────────────────────────────────┘
```

### Production Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Initial Deployment                                   │
├─────────────────────────────────────────────────────────┤
│  $ pnpm generate                                         │
│  $ pnpm migrate:prod                                    │
│  $ pnpm db:seed:prod                                    │
│  $ pnpm start:prod                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  2. Deploying Schema Changes                             │
├─────────────────────────────────────────────────────────┤
│  $ # Pull latest code with migrations                   │
│  $ pnpm generate                                         │
│  $ # Backup database!                                   │
│  $ cp db/main.db db/main.db.backup                      │
│  $ pnpm migrate:prod                                    │
│  $ pnpm start:prod                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  3. Rollback (if needed)                                 │
├─────────────────────────────────────────────────────────┤
│  $ # Restore from backup                                │
│  $ cp db/main.db.backup db/main.db                      │
│  $ pnpm start:prod                                      │
└─────────────────────────────────────────────────────────┘
```

## Database States

```
┌─────────────────────────────────────────────────────────┐
│  Development Database (db/dev.db)                       │
├─────────────────────────────────────────────────────────┤
│  State: Mutable                                         │
│  Purpose: Testing & Development                         │
│  Backup: Optional                                       │
│  Migration: Frequent                                    │
│  Data: Test data, can be reset                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Production Database (db/main.db)                       │
├─────────────────────────────────────────────────────────┤
│  State: Immutable (mostly)                              │
│  Purpose: Live Application Data                         │
│  Backup: Required                                       │
│  Migration: Careful, planned                            │
│  Data: Real user data, critical                         │
└─────────────────────────────────────────────────────────┘
```

## Quick Reference

| Command | Environment | Database | Use Case |
|---------|-------------|----------|----------|
| `pnpm migrate:dev` | dev | db/dev.db | Initial setup, track changes |
| `pnpm migrate:prod` | prod | db/main.db | Production deployment |
| `pnpm db:push:dev` | dev | db/dev.db | Rapid prototyping |
| `pnpm db:push:prod` | prod | db/main.db | Quick prod fix (rare) |
| `pnpm db:reset:dev` | dev | db/dev.db | Reset dev database |
| `pnpm db:reset:prod` | prod | db/main.db | Reset prod database (danger!) |
| `pnpm db:seed:dev` | dev | db/dev.db | Seed dev data |
| `pnpm db:seed:prod` | prod | db/main.db | Seed prod data |
| `pnpm dev` | dev | db/dev.db | Start dev server |
| `pnpm start:prod` | prod | db/main.db | Start prod server |