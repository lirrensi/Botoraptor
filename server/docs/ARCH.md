# Architecture Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [Technology Stack](#4-technology-stack)
5. [Core Components](#5-core-components)
6. [Data Flow](#6-data-flow)
7. [Security](#7-security)
8. [Setup & Deployment](#8-setup--deployment)
9. [Detailed Documentation](#9-detailed-documentation)

---

## 1. Project Overview

### 1.1 Purpose

ChatLayer is a microservice that transparently adds a human-in-the-loop to any bot/automated chat. It allows managers to see all user activity and intervene at any time.

### 1.2 Key Features

- **Message Management:** Store and retrieve chat messages with attachments
- **Real-time Updates:** Long-polling for near real-time message delivery
- **File Uploads:** Secure file storage with signed URLs
- **Webhooks:** Outgoing notifications for manager interventions
- **Multi-bot Support:** Handle multiple bots and conversations simultaneously

### 1.3 High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   UI/Bot    │────────▶│  ChatLayer   │────────▶│  Database   │
│   Client    │         │    API       │         │   (SQLite)  │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                         ┌──────────┐
                         │ Webhooks │
                         └──────────┘
```

---

## 2. System Architecture

### 2.1 Architecture Pattern

ChatLayer follows a **client-server architecture** with:

- **REST API** for message management
- **Long-polling** for real-time updates
- **Webhooks** for outgoing notifications
- **SQLite** database for persistence

### 2.2 Communication Flow

```
1. UI/Bot sends message → ChatLayer API
2. ChatLayer stores message → Database
3. ChatLayer notifies → Long-poll listeners
4. If manager message → ChatLayer triggers → Webhooks
```

---

## 3. Project Structure

```
server/
├── src/
│   ├── controllers/
│   │   └── messageController.ts    # Message CRUD operations
│   ├── helpers/
│   │   └── logpollManager.ts       # Long-polling implementation
│   ├── index.ts                    # Main application entry point
│   ├── prismaClient.ts             # Database client
│   └── swagger.ts                  # API documentation
├── prisma/
│   └── schema.prisma               # Database schema
├── config/
│   ├── server.json                 # Server configuration
│   └── client.json                 # Client configuration
├── docs/
│   ├── ARCH.md                     # This file
│   ├── FILE_HANDLING.md            # File upload & storage
│   ├── CONFIGURATION.md            # Configuration guide
│   ├── API_STRUCTURE.md            # API endpoints
│   ├── DATA_MODELS.md              # Database schema
│   ├── LONG_POLLING.md             # Real-time updates
│   └── WEBHOOKS.md                 # Webhook integration
├── public/
│   └── uploads/                    # File storage
├── package.json
├── tsconfig.json
└── ecosystem.config.cjs            # PM2 configuration
```

---

## 4. Technology Stack

### 4.1 Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Express.js | 5.2.1 | Web framework |
| Node.js | - | Runtime environment |
| Prisma | 7.3.0 | Database ORM |
| SQLite | - | Embedded database |

### 4.2 Key Dependencies

| Library | Purpose |
|---------|---------|
| `@prisma/client` | Database client |
| `multer` | File upload handling |
| `file-type` | MIME type detection |
| `swagger-jsdoc` | API documentation |
| `swagger-ui-express` | Swagger UI |
| `cors` | Cross-origin resource sharing |
| `body-parser` | Request body parsing |

### 4.3 Development Tools

| Tool | Purpose |
|------|---------|
| `tsx` | TypeScript execution |
| `pnpm` | Package manager |
| `prisma` | Database CLI |
| `pm2` | Process manager |

---

## 5. Core Components

### 5.1 API Layer

**Location:** `src/index.ts`

**Responsibilities:**
- HTTP request handling
- Authentication (API key middleware)
- File upload/download
- Response formatting
- Webhook dispatch

**See:** [API_STRUCTURE.md](API_STRUCTURE.md) for complete API documentation

### 5.2 Message Controller

**Location:** `src/controllers/messageController.ts`

**Responsibilities:**
- Message CRUD operations
- User management
- Bot and room queries
- Database interactions

**See:** [DATA_MODELS.md](DATA_MODELS.md) for data model details

### 5.3 Long-poll Manager

**Location:** `src/helpers/logpollManager.ts`

**Responsibilities:**
- Manage long-poll connections
- Route messages to listeners
- Filter by bot IDs and listener type

**See:** [LONG_POLLING.md](LONG_POLLING.md) for complete long-polling documentation

### 5.4 File Handler

**Location:** `src/index.ts` (lines 410-969)

**Responsibilities:**
- File upload processing
- Signed URL generation
- File access verification
- File cleanup (sweep job)

**See:** [FILE_HANDLING.md](FILE_HANDLING.md) for complete file handling documentation

### 5.5 Webhook Dispatcher

**Location:** `src/index.ts` (lines 148-277)

**Responsibilities:**
- Webhook configuration validation
- Asynchronous webhook dispatch
- Retry logic on failure
- Error logging

**See:** [WEBHOOKS.md](WEBHOOKS.md) for complete webhook documentation

---

## 6. Data Flow

### 6.1 Message Creation Flow

```
Client Request
    ↓
API Key Validation
    ↓
Message Controller
    ↓
Ensure User Exists
    ↓
Store Message in Database
    ↓
Populate Signed URLs (if attachments)
    ↓
Notify Long-poll Listeners
    ↓
Trigger Webhooks (if manager_message)
    ↓
Return Response to Client
```

### 6.2 File Upload Flow

```
Client Uploads File
    ↓
Multer Processes Upload
    ↓
Detect MIME Type
    ↓
Generate Server UUID
    ↓
Write to Disk
    ↓
Create Attachment Metadata
    ↓
Return Attachment Object
```

### 6.3 Long-poll Flow

```
Client Requests Updates
    ↓
Create Listener
    ↓
Wait for Messages or Timeout
    ↓
New Message Created
    ↓
Notify Matching Listeners
    ↓
Return Messages to Client
```

---

## 7. Security

### 7.1 Authentication

- **API Key Required:** All endpoints except `/health` and `/api/v1/getClientConfig`
- **Multiple Formats:** Bearer token, x-api-key header, or query parameter
- **Validation:** Checked on every request

**See:** [CONFIGURATION.md](CONFIGURATION.md) for API key setup

### 7.2 File Access

- **Signed URLs:** HMAC-SHA256 signatures with expiration
- **API Key Fallback:** Admin access via API key
- **Timing-Safe Comparison:** Prevents timing attacks

**See:** [FILE_HANDLING.md](FILE_HANDLING.md) for file security details

### 7.3 Data Protection

- **Server-Generated Filenames:** UUIDs prevent path traversal
- **Filename Sanitization:** Removes dangerous characters
- **MIME Type Detection:** From buffer, not just extension

### 7.4 Best Practices

- Change default API key in production
- Use strong `FILE_SIGNING_SECRET`
- Enable HTTPS in production
- Rotate secrets periodically
- Never commit secrets to version control

---

## 8. Setup & Deployment

### 8.1 Prerequisites

- Node.js (v18+ recommended)
- pnpm package manager

### 8.2 Installation

```bash
# Clone repository
git clone <repo-url>
cd server

# Install dependencies
pnpm install

# Setup database
pnpm migrate:dev

# Start development server
pnpm run dev
```

### 8.3 Configuration

**Required:**
- Set `FILE_SIGNING_SECRET` environment variable
- Update `apiKeys` in `config/server.json`

**Optional:**
- Configure `webhooks` in `config/server.json`
- Adjust `maxFileSize` and `fileTTLSeconds`

**See:** [CONFIGURATION.md](CONFIGURATION.md) for complete configuration guide

### 8.4 Production Deployment

```bash
# Build TypeScript
pnpm run build

# Run production migrations
NODE_ENV=production pnpm migrate:prod

# Start with PM2
pm2 start ecosystem.config.cjs
```

### 8.5 Environment Variables

```bash
# Required for file uploads
FILE_SIGNING_SECRET=your-secret-key

# Optional
NODE_ENV=production
```

---

## 9. Detailed Documentation

### 9.1 File Handling

**File:** [FILE_HANDLING.md](FILE_HANDLING.md)

**Topics:**
- File upload endpoints
- Storage and naming
- Signed URL generation
- File cleanup (sweep job)
- Security considerations

### 9.2 Configuration

**File:** [CONFIGURATION.md](CONFIGURATION.md)

**Topics:**
- Server configuration (`config/server.json`)
- Client configuration (`config/client.json`)
- Environment variables
- API key authentication
- Webhook configuration

### 9.3 API Structure

**File:** [API_STRUCTURE.md](API_STRUCTURE.md)

**Topics:**
- All API endpoints
- Request/response formats
- Authentication
- Error codes
- Usage examples

### 9.4 Data Models

**File:** [DATA_MODELS.md](DATA_MODELS.md)

**Topics:**
- Database schema
- User and Message models
- Attachment structure
- Message types
- Data flow diagrams

### 9.5 Long Polling

**File:** [LONG_POLLING.md](LONG_POLLING.md)

**Topics:**
- Long-poll architecture
- Listener types and roles
- Message routing
- Usage patterns
- Performance considerations

### 9.6 Webhooks

**File:** [WEBHOOKS.md](WEBHOOKS.md)

**Topics:**
- Webhook configuration
- Payload format
- Retry logic
- Security best practices
- Use cases and examples

---

## Appendix

### A. Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `pnpm run dev` |
| Build for production | `pnpm run build` |
| Run migrations | `pnpm migrate:dev` |
| Reset database | `pnpm db:reset` |
| View API docs | Open `/api-docs` in browser |

### B. Default Ports

| Service | Port |
|---------|------|
| HTTP API | 31000 |
| Swagger UI | 31000/api-docs |

### C. File Locations

| Item | Location |
|------|----------|
| Server config | `config/server.json` |
| Client config | `config/client.json` |
| Database | `prisma/dev.db` (default) |
| Uploads | `public/uploads/` |
| Logs | PM2 logs (if using PM2) |

### D. Common Issues

**Issue:** File uploads fail
- **Solution:** Set `FILE_SIGNING_SECRET` environment variable

**Issue:** "Unauthorized" errors
- **Solution:** Check API key in request and `config/server.json`

**Issue:** Database connection errors
- **Solution:** Run `pnpm migrate:dev` to initialize database

**Issue:** Webhooks not triggering
- **Solution:** Check `messageType` is `"manager_message"` and webhooks are configured

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial architecture documentation |
| 1.1 | 2026-01-31 | Split into focused mini-doc files, fixed version errors |

---

**Last Updated:** 2026-01-31
**Maintained By:** ChatLayer Team