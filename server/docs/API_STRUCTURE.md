# API Structure

## Overview

ChatLayer provides a REST API for message management, file uploads, and real-time updates via long-polling. All endpoints (except health check and client config) require API key authentication.

## Base URL

```
http://localhost:31000/api/v1
```

## Authentication

All protected endpoints require API key authentication via one of these methods:

1. **Authorization Header (Bearer):**
   ```http
   Authorization: Bearer your-api-key
   ```

2. **x-api-key Header:**
   ```http
   x-api-key: your-api-key
   ```

3. **Query Parameter:**
   ```
   ?api_key=your-api-key
   ```

**See Also:** [CONFIGURATION.md](CONFIGURATION.md) for API key setup.

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

Or flattened for objects:
```json
{
  "success": true,
  "message": { /* message object */ }
}
```

### Error Response

```json
{
  "success": false,
  "errorMessage": "Error description",
  "details": { /* optional error details */ }
}
```

## Endpoints

### Health Check

#### GET /health

Check if the server is running.

**Authentication:** None

**Response:**
```json
{
  "success": true,
  "ok": true
}
```

---

### Client Configuration

#### GET /api/v1/getClientConfig

Get client-side configuration.

**Authentication:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "quickAnswersPreset": ["Hello! Thanks for reaching out!"]
  }
}
```

**See Also:** [CONFIGURATION.md](CONFIGURATION.md) for client configuration details.

---

### Message Management

#### POST /api/v1/addMessage

Add a message to the database and notify listeners.

**Authentication:** Required

**Request Body:**
```json
{
  "botId": "bot-123",
  "roomId": "room-456",
  "userId": "user-789",
  "username": "john_doe",
  "name": "John Doe",
  "messageType": "user_message",
  "text": "Hello, world!",
  "attachments": [
    {
      "id": "uuid-here",
      "type": "image",
      "isExternal": false,
      "filename": "photo.jpg",
      "url": ""
    }
  ],
  "meta": {
    "customField": "value"
  }
}
```

**Required Fields:**
- `botId` (string): Bot identifier
- `roomId` (string): Room identifier
- `userId` (string): User identifier

**Optional Fields:**
- `username` (string): Username
- `name` (string): Display name
- `messageType` (string): Message type (default: `"user_message"`)
  - `"user_message"` - Regular user message
  - `"user_message_service"` - Service message from user
  - `"bot_message_service"` - Service message from bot
  - `"manager_message"` - Manager/human-in-the-loop message
  - `"service_call"` - Service call record
  - `"error_message"` - Error message
- `text` (string): Message text (default: `""`)
- `attachments` (array): Attachment objects
- `meta` (object): Custom metadata

**Response:**
```json
{
  "success": true,
  "message": {
    "id": 123,
    "botId": "bot-123",
    "roomId": "room-456",
    "userId": "user-789",
    "messageType": "user_message",
    "text": "Hello, world!",
    "attachments": [...],
    "meta": {...},
    "createdAt": "2026-01-31T00:00:00.000Z"
  }
}
```

**Behavior:**
- Creates user if not exists
- Stores message in database
- Notifies long-poll listeners based on `messageType`:
  - `"manager_message"` → notifies bot listeners
  - All other types → notifies UI listeners
- Sends to configured webhooks if `messageType` is `"manager_message"`

**Implementation:** `src/index.ts` (lines 10035-10069)

---

#### POST /api/v1/addMessageSingle

Upload a single file and create a message in one request.

**Authentication:** Required

**Request (multipart/form-data):**
- `file`: Binary file (single)
- `type`: Optional type hint (`"image" | "video" | "document" | "file"`)
- `filename`: Optional filename hint
- `botId` (string, required): Bot identifier
- `roomId` (string, required): Room identifier
- `userId` (string, required): User identifier
- `username` (string, optional): Username
- `name` (string, optional): Display name
- `messageType` (string, optional): Message type
- `text` (string, optional): Message text
- `meta` (string/object, optional): JSON metadata

**Response:**
```json
{
  "success": true,
  "message": {
    "id": 123,
    "botId": "bot-123",
    "roomId": "room-456",
    "userId": "user-789",
    "messageType": "user_message",
    "text": "Hello with file!",
    "attachments": [
      {
        "id": "uuid-here",
        "type": "image",
        "isExternal": false,
        "filename": "photo.jpg",
        "url": ""
      }
    ],
    "createdAt": "2026-01-31T00:00:00.000Z"
  }
}
```

**Behavior:**
- Uploads file to disk with server-generated UUID
- Creates message with attachment
- Notifies listeners and webhooks (same as `/addMessage`)

**See Also:** [FILE_HANDLING.md](FILE_HANDLING.md) for file upload details

**Implementation:** `src/index.ts` (lines 7899-7894)

---

#### GET /api/v1/getMessages

Get messages for a bot/room with pagination.

**Authentication:** Required

**Query Parameters:**
- `botId` (string, required): Bot identifier
- `roomId` (string, optional): Room identifier
- `cursorId` (number, optional): Message ID cursor for pagination (returns messages older than this ID)
- `limit` (number, optional): Max messages to return (default: 20)
- `types` (string, optional): Comma-separated message types to filter

**Example:**
```
GET /api/v1/getMessages?botId=bot-123&roomId=room-456&limit=50&types=user_message,manager_message
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 123,
      "botId": "bot-123",
      "roomId": "room-456",
      "userId": "user-789",
      "messageType": "user_message",
      "text": "Hello, world!",
      "attachments": [
        {
          "id": "uuid-here",
          "type": "image",
          "isExternal": false,
          "filename": "photo.jpg",
          "url": "/uploads/uuid.jpg?exp=1234567890&sig=abc123&filename=photo.jpg"
        }
      ],
      "meta": {...},
      "createdAt": "2026-01-31T00:00:00.000Z"
    }
  ]
}
```

**Behavior:**
- Returns messages in reverse chronological order (newest first)
- Supports cursor-based pagination via `cursorId`
- Filters by `botId` (required) and optionally `roomId`
- Filters by message types if `types` parameter provided
- Populates signed URLs for internal attachments

**Implementation:** `src/index.ts` (lines 10139-10164)

---

### User Management

#### POST /api/v1/addUser

Create or get a user (idempotent).

**Authentication:** Required

**Request Body:**
```json
{
  "botId": "bot-123",
  "userId": "user-789",
  "username": "john_doe",
  "name": "John Doe"
}
```

**Required Fields:**
- `botId` (string): Bot identifier
- `userId` (string): User identifier

**Optional Fields:**
- `username` (string): Username (defaults to `userId` if not provided)
- `name` (string): Display name

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "botId": "bot-123",
    "userId": "user-789",
    "username": "john_doe",
    "name": "John Doe",
    "createdAt": "2026-01-31T00:00:00.000Z",
    "blocked": false
  }
}
```

**Behavior:**
- Returns existing user if `botId` + `userId` combination exists
- Creates new user if not exists
- Username defaults to `userId` if not provided

**Implementation:** `src/index.ts` (lines 10091-10104)

---

### Bot & Room Management

#### GET /api/v1/getBots

Get all distinct bot IDs from messages.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "bots": ["bot-123", "bot-456", "bot-789"]
}
```

**Behavior:**
- Returns unique list of `botId` values from all messages
- Sorted alphabetically

**Implementation:** `src/index.ts` (lines 10175-10183)

---

#### GET /api/v1/getRooms

Get rooms for a bot with users and last message.

**Authentication:** Required

**Query Parameters:**
- `botId` (string, required): Bot identifier
- `messageType` (string, optional): Filter rooms by message type
- `depth` (number, optional): Number of recent messages to check when filtering (default: 5)

**Example:**
```
GET /api/v1/getRooms?botId=bot-123&messageType=error_message&depth=10
```

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "botId": "bot-123",
      "roomId": "room-456",
      "users": [
        {
          "id": 1,
          "botId": "bot-123",
          "userId": "user-789",
          "username": "john_doe",
          "name": "John Doe",
          "createdAt": "2026-01-31T00:00:00.000Z",
          "blocked": false
        }
      ],
      "lastMessage": {
        "id": 123,
        "botId": "bot-123",
        "roomId": "room-456",
        "userId": "user-789",
        "messageType": "user_message",
        "text": "Hello, world!",
        "attachments": [...],
        "createdAt": "2026-01-31T00:00:00.000Z"
      }
    }
  ]
}
```

**Behavior:**
- Returns rooms ordered by most recent message
- Includes all users in each room
- Includes last message for each room
- If `messageType` provided, only returns rooms where that type appears in last `depth` messages
- Populates signed URLs for attachments in `lastMessage`

**Use Case:** Finding rooms with specific message types (e.g., error messages)

**Implementation:** `src/index.ts` (lines 10211-10247)

---

### File Upload

#### POST /api/v1/uploadFile

Upload one or more files.

**Authentication:** Required

**Request (multipart/form-data):**
- `file`: Binary file(s) (array)
- `type[]`: Optional array of types (`"image" | "video" | "document" | "file"`)
- `filename[]`: Optional array of filenames for metadata

**Response:**
```json
{
  "success": true,
  "attachments": [
    {
      "id": "uuid-here",
      "type": "image",
      "isExternal": false,
      "filename": "photo.jpg",
      "original_name": "photo.jpg",
      "mime_type": "image/jpeg",
      "size": 12345,
      "createdAt": "2026-01-31T00:00:00.000Z",
      "url": ""
    }
  ]
}
```

**Behavior:**
- Stores files on disk with server-generated UUIDs
- Detects MIME type from buffer
- Returns attachment metadata (URL is empty for internal files)

**See Also:** [FILE_HANDLING.md](FILE_HANDLING.md) for complete file upload documentation

**Implementation:** `src/index.ts` (lines 5584-5623)

---

#### POST /api/v1/uploadFileByURL

Upload files by fetching from remote URLs.

**Authentication:** Required

**Request Body:**
```json
{
  "files": [
    {
      "url": "https://example.com/file.jpg",
      "filename": "optional-name.jpg",
      "type": "image"
    }
  ]
}
```

**Response:** Same as `/uploadFile`

**Behavior:**
- Fetches remote file using `fetch` or `node-fetch`
- Detects MIME type from buffer or Content-Type header
- Stores file with server-generated UUID

**See Also:** [FILE_HANDLING.md](FILE_HANDLING.md) for complete file upload documentation

**Implementation:** `src/index.ts` (lines 5631-5787)

---

### Long-Polling

#### GET /api/v1/getUpdates

Long-poll for real-time message updates.

**Authentication:** Required

**Query Parameters:**
- `botIds` (string, optional): Comma-separated bot IDs to listen for (default: all bots)
- `timeoutMs` (number, optional): Timeout in milliseconds (default: 30000)
- `listenerType` (string, optional): Listener role (`"bot"` or `"ui"`, default: `"bot"`)

**Example:**
```
GET /api/v1/getUpdates?botIds=bot-123,bot-456&timeoutMs=60000&listenerType=ui
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 123,
      "botId": "bot-123",
      "roomId": "room-456",
      "userId": "user-789",
      "messageType": "user_message",
      "text": "Hello, world!",
      "attachments": [...],
      "createdAt": "2026-01-31T00:00:00.000Z"
    }
  ]
}
```

**Behavior:**
- Waits until new messages arrive or timeout expires
- Returns empty array on timeout
- Filters messages by `botIds` if provided
- Routes messages based on `listenerType`:
  - `"bot"` listeners receive messages sent to bot role
  - `"ui"` listeners receive messages sent to UI role
- Populates signed URLs for attachments

**Message Routing:**
- `messageType: "manager_message"` → sent to `"bot"` listeners
- All other message types → sent to `"ui"` listeners

**See Also:** [LONG_POLLING.md](LONG_POLLING.md) for complete long-polling documentation

**Implementation:** `src/index.ts` (lines 10250-10300)

---

### File Access

#### GET /uploads/:file

Access uploaded file via signed URL or API key.

**Authentication:** Signed URL OR API key

**Query Parameters (Signed URL):**
- `exp` (number, required): Expiration timestamp (Unix epoch)
- `sig` (string, required): HMAC-SHA256 signature
- `filename` (string, optional): Original filename for Content-Disposition header

**Example:**
```
GET /uploads/uuid.jpg?exp=1738334400&sig=abc123def456&filename=photo.jpg
```

**Alternative (API Key):**
```
GET /uploads/uuid.jpg?api_key=your-api-key&filename=photo.jpg
```

**Response:** File binary with `Content-Disposition: attachment; filename*=UTF-8''<encoded-name>`

**Behavior:**
- Validates signature and expiration if using signed URL
- Validates API key if using API key authentication
- Returns 403 if authentication fails
- Returns 404 if file not found

**See Also:** [FILE_HANDLING.md](FILE_HANDLING.md) for signed URL documentation

**Implementation:** `src/index.ts` (lines 289-403)

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created (for POST endpoints) |
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 403 | Forbidden (invalid/expired signature) |
| 404 | Not found (file not found) |
| 500 | Internal server error |
| 502 | Bad gateway (failed to fetch remote file) |

## Rate Limiting

Currently not implemented. Consider adding rate limiting for production use.

## CORS

CORS is enabled for all origins. Configure CORS middleware in `src/index.ts` (line 145) for production restrictions.

## API Documentation

Interactive API documentation available at `/api-docs` when server is running (Swagger UI).

## Related Files

- **Main Router:** `src/index.ts`
- **Message Controller:** `src/controllers/messageController.ts`
- **Long-poll Manager:** `src/helpers/logpollManager.ts`

## See Also

- [CONFIGURATION.md](CONFIGURATION.md) - API key and server configuration
- [FILE_HANDLING.md](FILE_HANDLING.md) - File upload endpoints
- [LONG_POLLING.md](LONG_POLLING.md) - Real-time updates
- [DATA_MODELS.md](DATA_MODELS.md) - Data structures