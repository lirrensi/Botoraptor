# Database Setup Guide

This guide explains how to initialize and manage databases for development and production environments.

## Database Naming Convention

The database name is determined by the `NODE_ENV` environment variable:

- **Development** (default): `db/dev.db`
- **Production**: `db/main.db`

This is configured in `.env`:
```bash
DATABASE_URL="file:./db/${NODE_ENV:-dev}.db"
```

## Quick Start

### Development Database
```bash
# Initialize development database (creates db/dev.db)
pnpm migrate:dev

# Or use db push (faster, no migration history)
pnpm db:push:dev

# Seed development database
pnpm db:seed:dev

# Start development server
pnpm dev
```

### Production Database
```bash
# Initialize production database (creates db/main.db)
pnpm migrate:prod

# Or use db push (faster, no migration history)
pnpm db:push:prod

# Seed production database
pnpm db:seed:prod

# Start production server
pnpm start:prod
```

## Available Scripts

### Migration Commands

| Command | Environment | Database | Description |
|---------|-------------|----------|-------------|
| `pnpm migrate:dev` | Development | `db/dev.db` | Create and run migrations with history |
| `pnpm migrate:prod` | Production | `db/main.db` | Deploy migrations (production-safe) |
| `pnpm db:push:dev` | Development | `db/dev.db` | Push schema changes (no history, faster) |
| `pnpm db:push:prod` | Production | `db/main.db` | Push schema changes (no history, faster) |

### Database Management Commands

| Command | Environment | Database | Description |
|---------|-------------|----------|-------------|
| `pnpm db:seed:dev` | Development | `db/dev.db` | Seed development database |
| `pnpm db:seed:prod` | Production | `db/main.db` | Seed production database |
| `pnpm db:reset:dev` | Development | `db/dev.db` | Reset and re-run migrations |
| `pnpm db:reset:prod` | Production | `db/main.db` | Reset and re-run migrations |
| `pnpm db:studio` | Both | Depends on NODE_ENV | Open Prisma Studio GUI |

### Server Commands

| Command | Environment | Database | Description |
|---------|-------------|----------|-------------|
| `pnpm dev` | Development | `db/dev.db` | Start development server |
| `pnpm start` | Development | `db/dev.db` | Start server (default) |
| `pnpm start:prod` | Production | `db/main.db` | Start production server |

## Workflow Examples

### Initial Setup (Development)

```bash
# 1. Generate Prisma Client
pnpm generate

# 2. Create development database and run migrations
pnpm migrate:dev

# 3. (Optional) Seed database with initial data
pnpm db:seed:dev

# 4. Start development server
pnpm dev
```

### Initial Setup (Production)

```bash
# 1. Generate Prisma Client
pnpm generate

# 2. Create production database and deploy migrations
pnpm migrate:prod

# 3. (Optional) Seed database with initial data
pnpm db:seed:prod

# 4. Start production server
pnpm start:prod
```

### Making Schema Changes

**Development Workflow:**
```bash
# 1. Edit prisma/schema.prisma

# 2. Apply changes to development database
pnpm db:push:dev

# 3. Test changes locally
pnpm dev

# 4. Create migration for production
pnpm migrate:dev --name your_change_name
```

**Production Deployment:**
```bash
# 1. Deploy migration to production
pnpm migrate:prod

# 2. Restart production server
pnpm start:prod
```

### Resetting Database

**Development:**
```bash
# WARNING: This deletes all data!
pnpm db:reset:dev
```

**Production:**
```bash
# WARNING: This deletes all data!
pnpm db:reset:prod
```

## Database Files

After initialization, you'll have:

```
server/
├── db/
│   ├── dev.db          # Development database
│   ├── dev.db-journal  # SQLite journal file (temporary)
│   ├── main.db         # Production database (if initialized)
│   └── main.db-journal # SQLite journal file (temporary)
└── prisma/
    ├── schema.prisma   # Database schema definition
    ├── migrations/     # Migration history
    └── seed.ts         # Database seeding script
```

## Environment Variables

Key environment variables in `.env`:

```bash
# Database URL (automatically selects dev.db or main.db based on NODE_ENV)
DATABASE_URL="file:./db/${NODE_ENV:-dev}.db"

# File signing secret for secure file uploads
FILE_SIGNING_SECRET="your-secret-key-here"
```

## Prisma Studio

To inspect your database visually:

```bash
# Open development database
pnpm db:studio

# Open production database
NODE_ENV=production pnpm db:studio
```

This will open a web interface at `http://localhost:5555` where you can:
- Browse tables and records
- Add, edit, and delete data
- Run queries
- View relationships

## Troubleshooting

### Database Locked Error

If you see "database is locked" errors:
1. Stop the server (`Ctrl+C`)
2. Delete the `-journal` file: `rm db/dev.db-journal` or `rm db/main.db-journal`
3. Restart the server

### Migration Conflicts

If migrations fail:
```bash
# Reset database (WARNING: deletes data)
pnpm db:reset:dev  # or db:reset:prod
```

### Wrong Database Being Used

Check which database is being used:
```bash
# Development
echo $NODE_ENV  # Should be empty or "dev"

# Production
export NODE_ENV=production
echo $NODE_ENV  # Should be "production"
```

## Best Practices

1. **Always test migrations in development first** before running in production
2. **Use `db:push` for rapid prototyping** in development
3. **Use `migrate` for production deployments** to maintain migration history
4. **Backup production database** before running migrations
5. **Never commit database files** (`*.db`, `*.db-journal`) to version control
6. **Keep `.env` secure** and never commit it with real secrets

## Git Ignore

Ensure your `.gitignore` includes:
```
# Database files
db/*.db
db/*.db-journal

# Environment variables
.env
.env.local
.env.*.local
```