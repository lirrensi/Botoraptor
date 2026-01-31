# Data Models

## Overview

ChatLayer uses SQLite as its database with Prisma ORM. The data model consists of two main entities: Users and Messages, with support for attachments and custom metadata.

## Database Schema

### Prisma Schema

**Location:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  // URL configured in prisma.config.ts
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated"
}

enum MessageType {
  user_message
  user_message_service
  bot_message_service
  manager_message
  service_call
  error_message
}

model User {
  id        Int      @id @default(autoincrement())
  botId     String
  userId    String
  username  String
  name      String?
  createdAt DateTime @default(now())
  blocked   Boolean  @default(false)

  messages  Message[] @relation("UserMessages")

  @@unique([botId, userId])
}

model Message {
  id          Int         @id @default(autoincrement())
  botId       String
  roomId      String
  userId      String
  messageType MessageType
  text        String
  attachments Json?
  meta        Json?
  createdAt   DateTime    @default(now())

  user        User?       @relation("UserMessages", fields: [userId, botId], references: [userId, botId])

  @@index([botId, roomId])
}
```

## Data Models

### User

Represents a user in the system, scoped to a specific bot.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Primary key (auto-increment) |
| `botId` | String | Bot identifier (part of unique constraint) |
| `userId` | String | User identifier (part of unique constraint) |
| `username` | String | Username (defaults to `userId` if not provided) |
| `name` | String? | Display name (optional) |
| `createdAt` | DateTime | Creation timestamp |
| `blocked` | Boolean | Whether user is blocked (default: false) |

**Constraints:**
- Unique constraint on `[botId, userId]` combination
- One user per bot/userId pair

**Relationships:**
- `messages`: One-to-many relationship with Message

**TypeScript Interface:**
```typescript
type User = {
  id: number;
  botId: string;
  userId: string;
  username: string;
  name?: string | null;
  createdAt: Date;
  blocked: boolean;
};
```

### Message

Represents a message in a conversation.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Primary key (auto-increment) |
| `botId` | String | Bot identifier |
| `roomId` | String | Room/conversation identifier |
| `userId` | String | User identifier |
| `messageType` | MessageType | Type of message (see enum below) |
| `text` | String | Message text content |
| `attachments` | Json? | Array of attachment objects (optional) |
| `meta` | Json? | Custom metadata (optional) |
| `createdAt` | DateTime | Creation timestamp |

**Constraints:**
- Indexed on `[botId, roomId]` for efficient queries

**Relationships:**
- `user`: Many-to-one relationship with User (optional)

**TypeScript Interface:**
```typescript
type Message = {
  id: number;
  botId: string;
  roomId: string;
  userId: string;
  messageType: MessageType;
  text: string;
  attachments?: Attachment[] | null;
  meta?: Record<string, any> | null;
  createdAt: Date;
};
```

### MessageType Enum

Defines the type of message for routing and display purposes.

**Values:**

| Value | Description | Routing |
|-------|-------------|---------|
| `user_message` | Regular user message | UI listeners |
| `user_message_service` | Service message from user | UI listeners |
| `bot_message_service` | Service message from bot | UI listeners |
| `manager_message` | Manager/human-in-the-loop message | Bot listeners + webhooks |
| `service_call` | Service call record | UI listeners |
| `error_message` | Error message | UI listeners |

**TypeScript Type:**
```typescript
type MessageType =
  | "user_message"
  | "user_message_service"
  | "bot_message_service"
  | "manager_message"
  | "service_call"
  | "error_message"
  | string;
```

### Attachment

Represents a file attachment (stored as JSON in Message).

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Attachment ID (UUID, no extension) |
| `type` | string | Category: `"image" | "video" | "document" | "file"` |
| `isExternal` | boolean | Whether attachment is external URL |
| `url` | string? | Attachment URL (empty for internal files) |
| `filename` | string? | Display filename |
| `original_name` | string? | Original filename from upload |
| `mime_type` | string? | MIME type |
| `size` | number? | File size in bytes |
| `createdAt` | Date? | Upload timestamp |

**TypeScript Interface:**
```typescript
type Attachment = {
  id: string;
  type: "image" | "video" | "document" | "file";
  isExternal: boolean;
  url?: string | null;
  filename?: string | null;
  original_name?: string | null;
  mime_type?: string;
  size?: number;
  createdAt?: Date;
};
```

**Note:** Internal attachments have `url: ""` when stored. Signed URLs are populated dynamically when messages are fetched.

## Data Flow

### Creating a User

**Endpoint:** `POST /api/v1/addUser`

**Flow:**
1. API receives request with `botId`, `userId`, `username`, `name`
2. Controller calls `createOrGetUser(botId, userId, username, name)`
3. Database queries for existing user with matching `botId` + `userId`
4. If exists: return existing user
5. If not exists: create new user with provided data
6. Return user object

**Implementation:** `src/controllers/messageController.ts` (lines 64-92)

### Creating a Message

**Endpoint:** `POST /api/v1/addMessage`

**Flow:**
1. API receives request with message data
2. Controller calls `addMessage(payload)`
3. `addMessage` ensures user exists via `createOrGetUser`
4. Message is created in database with:
   - `botId`, `roomId`, `userId`
   - `messageType` (defaults to `"user_message"`)
   - `text` (defaults to `""`)
   - `attachments` (JSON array)
   - `meta` (JSON object)
5. Signed URLs are populated for internal attachments
6. Long-poll listeners are notified based on `messageType`
7. If `messageType` is `"manager_message"`, webhooks are triggered
8. Return created message

**Implementation:** `src/controllers/messageController.ts` (lines 94-124)

### Retrieving Messages

**Endpoint:** `GET /api/v1/getMessages`

**Flow:**
1. API receives request with `botId`, optional filters
2. Controller calls `getMessages(opts)`
3. Database query with filters:
   - `botId` (required)
   - `roomId` (optional)
   - `cursorId` (optional, for pagination)
   - `types` (optional, message type filter)
4. Messages ordered by `createdAt DESC` (newest first)
5. Limited by `limit` parameter (default: 20)
6. Signed URLs populated for internal attachments
7. Return messages array

**Implementation:** `src/controllers/messageController.ts` (lines 134-148)

### Retrieving Rooms

**Endpoint:** `GET /api/v1/getRooms`

**Flow:**
1. API receives request with `botId`, optional filters
2. Controller calls `getRooms(opts)`
3. Database queries all messages for `botId`
4. Messages grouped by `roomId`
5. For each room:
   - Collect distinct `userId` values
   - Fetch user records for those users
   - Get last message (first in sorted list)
   - Apply `messageType` filter if provided (check last `depth` messages)
6. Return rooms array with users and lastMessage

**Implementation:** `src/controllers/messageController.ts` (lines 183-264)

## Database Operations

### User Operations

#### Create or Get User

```typescript
async function createOrGetUser(
  botId: string,
  userId: string,
  username?: string,
  name?: string | null
): Promise<User>
```

**Behavior:**
- Idempotent: returns existing user if found
- Creates new user if not exists
- Username defaults to `userId` if not provided

#### Add User (API Helper)

```typescript
async function addUser(
  botId: string,
  userId: string,
  username?: string,
  name?: string | null
): Promise<User>
```

**Behavior:**
- Wrapper around `createOrGetUser`
- Same behavior as above

### Message Operations

#### Add Message

```typescript
async function addMessage(payload: AddMessageInput): Promise<Message>
```

**Parameters:**
```typescript
type AddMessageInput = {
  botId: string;
  roomId: string;
  userId: string;
  username?: string;
  name?: string | null;
  messageType?: Message["messageType"];
  text?: string;
  attachments?: Attachment[] | null;
  meta?: Record<string, any> | null;
};
```

**Behavior:**
- Ensures user exists
- Creates message with provided data
- Returns created message

#### Get Messages

```typescript
async function getMessages(opts: GetMessagesOptions = {}): Promise<Message[]>
```

**Parameters:**
```typescript
type GetMessagesOptions = {
  botId?: string;
  roomId?: string;
  cursorId?: number;
  limit?: number;
  types?: Message["messageType"][];
};
```

**Behavior:**
- Filters by `botId` (required in practice)
- Filters by `roomId` if provided
- Pagination via `cursorId` (returns messages with `id < cursorId`)
- Limits results (default: 20)
- Filters by message types if provided
- Returns messages in reverse chronological order

#### Get Bots

```typescript
async function getBots(): Promise<string[]>
```

**Behavior:**
- Fetches all `botId` values from messages
- Returns unique list sorted alphabetically

#### Get Rooms

```typescript
async function getRooms(opts: GetRoomsOptions): Promise<{ rooms: RoomInfo[] }>
```

**Parameters:**
```typescript
type GetRoomsOptions = {
  botId: string;
  messageType?: string;
  depth?: number;
};
```

**Behavior:**
- Returns rooms for specified `botId`
- Includes users and lastMessage for each room
- Filters by `messageType` if provided (checks last `depth` messages)
- Returns rooms ordered by most recent message

## JSON Fields

### attachments

Stored as JSON array in Message table.

**Structure:**
```json
[
  {
    "id": "uuid-here",
    "type": "image",
    "isExternal": false,
    "filename": "photo.jpg",
    "original_name": "photo.jpg",
    "mime_type": "image/jpeg",
    "size": 12345,
    "createdAt": "2026-01-31T00:00:00.000Z"
  }
]
```

**Usage:**
- Internal attachments: `isExternal: false`, `url: ""`
- External attachments: `isExternal: true`, `url: "https://..."`

### meta

Stored as JSON object in Message table.

**Structure:**
```json
{
  "customField": "value",
  "nested": {
    "key": "value"
  }
}
```

**Usage:**
- Arbitrary metadata for custom integrations
- No schema validation
- Can be `null` or omitted

## Database Indexes

### User Table

- **Primary Key:** `id` (auto-increment)
- **Unique Index:** `[botId, userId]`

### Message Table

- **Primary Key:** `id` (auto-increment)
- **Index:** `[botId, roomId]` for efficient room-based queries

## Database Migration

### Initial Setup

```bash
pnpm install
prisma migrate dev --name init
```

### Development Migration

```bash
pnpm migrate:dev
```

### Production Migration

```bash
NODE_ENV=production pnpm migrate:prod
```

### Reset Database

```bash
pnpm db:reset
```

**Warning:** This deletes all data!

## Database Client

**Location:** `src/prismaClient.ts`

```typescript
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

export default prisma;
```

**Usage:**
```typescript
import prisma from "./prismaClient";

const user = await prisma.user.findFirst({
  where: { botId, userId }
});
```

## Data Integrity

### User-Message Relationship

- Messages reference users via `[userId, botId]` foreign key
- User can be deleted (messages will have `user: null`)
- Messages are not cascaded when user is deleted

### Unique Constraints

- `[botId, userId]` ensures one user per bot/userId pair
- Prevents duplicate user records

### Indexes

- `[botId, roomId]` index on Message table for efficient queries
- Primary key indexes on both tables

## Related Files

- **Schema:** `prisma/schema.prisma`
- **Client:** `src/prismaClient.ts`
- **Controller:** `src/controllers/messageController.ts`
- **Types:** `src/controllers/messageController.ts` (lines 9-62)

## See Also

- [API_STRUCTURE.md](API_STRUCTURE.md) - API endpoints for data operations
- [FILE_HANDLING.md](FILE_HANDLING.md) - Attachment storage and management
- [CONFIGURATION.md](CONFIGURATION.md) - Database configuration