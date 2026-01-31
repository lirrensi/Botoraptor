# Configuration

## Overview

ChatLayer uses a two-tier configuration system: JSON files for application settings and environment variables for sensitive data. Configuration is loaded at startup from the `config/` directory.

## Configuration Files

### server.json

**Location:** `config/server.json`

**Purpose:** Server-side configuration including port, API keys, file handling, and webhooks.

**Structure:**
```json
{
  "port": 31000,
  "apiKeys": ["replace-me"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800,
  "webhooks": []
}
```

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | 31000 | HTTP server port |
| `apiKeys` | string[] | `["replace-me"]` | Valid API keys for authentication |
| `maxFileSize` | number | 10485760 | Maximum upload size in bytes (10 MB) |
| `fileTTLSeconds` | number | 604800 | File cleanup TTL in seconds (7 days) |
| `webhooks` | array | `[]` | Webhook configurations (see [WEBHOOKS.md](WEBHOOKS.md)) |

**Loading:** Loaded at startup in `src/index.ts` (lines 127-137)

```typescript
const configPath = path.resolve(process.cwd(), "config", "server.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as {
    port?: number;
    apiKeys?: string[];
    maxFileSize?: number;
    fileTTLSeconds?: number;
    webhooks?: any[];
};
```

### client.json

**Location:** `config/client.json`

**Purpose:** Client-side configuration exposed via API.

**Structure:**
```json
{
  "quickAnswersPreset": ["Hello! Thanks for reaching out!"]
}
```

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `quickAnswersPreset` | string[] | `["Hello! Thanks for reaching out!"]` | Predefined quick reply messages |

**Loading:** Loaded at startup in `src/index.ts` (lines 128-139)

**Access:** Available via `GET /api/v1/getClientConfig`

## Environment Variables

### Required for File Uploads

#### FILE_SIGNING_SECRET

**Purpose:** Secret key for HMAC-SHA256 file URL signing.

**Required:** Yes (file uploads will fail without it)

**Example:**
```bash
FILE_SIGNING_SECRET=your-super-secret-key-here-change-in-production
```

**Usage:**
- Generates signed URLs for file access
- Verifies file access requests
- Prevents unauthorized file downloads

**Impact if Missing:**
- Warning logged at startup
- File upload endpoints return errors
- Signed URL generation fails

**Implementation:** `src/index.ts` (lines 18-23, 27-68)

### Optional

#### NODE_ENV

**Purpose:** Environment indicator (development/production).

**Values:** `"development"`, `"production"`

**Usage:**
- Database migration commands (`migrate:prod`, `db:push:prod`)
- May affect logging or error handling in future

**Example:**
```bash
NODE_ENV=production
```

## Configuration Priority

1. **Environment Variables:** Override everything (e.g., `FILE_SIGNING_SECRET`)
2. **JSON Files:** Application settings (server.json, client.json)
3. **Code Defaults:** Fallback values in TypeScript code

## API Key Authentication

### How API Keys Work

All API endpoints (except `/health` and `/api/v1/getClientConfig`) require authentication via API key.

### Accepted Formats

API keys can be provided in three ways:

1. **Authorization Header (Bearer):**
   ```http
   Authorization: Bearer your-api-key-here
   ```

2. **x-api-key Header:**
   ```http
   x-api-key: your-api-key-here
   ```

3. **Query Parameter:**
   ```
   ?api_key=your-api-key-here
   ```

### Implementation

**Location:** `src/index.ts` (lines 334-350)

```typescript
function apiKeyMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let key = req.header("authorization") as string | undefined;

    // Extract Bearer token if present
    if (typeof key === "string") {
        const m = key.match(/^Bearer\s+(.+)$/i);
        if (m) key = m[1];
    }

    const keys = (config.apiKeys || []) as string[];
    if (!key || !keys.includes(String(key))) {
        return sendError(res, 401, "Unauthorized - invalid api key");
    }
    return next();
}
```

### Security Best Practices

1. **Change Default Key:** Replace `"replace-me"` with a strong, random key
2. **Use Multiple Keys:** Different keys for different environments/services
3. **Rotate Keys:** Periodically change API keys
4. **Never Commit Keys:** Keep API keys out of version control
5. **Use Environment Variables:** Consider moving API keys to environment variables in production

## Webhook Configuration

Webhooks are configured in `server.json` under the `webhooks` array.

**Structure:**
```json
{
  "webhooks": [
    {
      "url": "https://example.com/webhook",
      "headers": {
        "Authorization": "Bearer webhook-secret"
      },
      "query": {
        "source": "chatlayer"
      },
      "retry": {
        "attempts": 3,
        "delay_ms": 3000
      }
    }
  ]
}
```

**Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | Webhook endpoint URL |
| `headers` | object | No | `{}` | Custom HTTP headers |
| `query` | object | No | `{}` | Query parameters to append |
| `retry.attempts` | number | No | 3 | Number of retry attempts |
| `retry.delay_ms` | number | No | 3000 | Delay between retries (ms) |

**Validation:** Invalid webhook entries are logged and skipped at startup.

**See Also:** [WEBHOOKS.md](WEBHOOKS.md) for full webhook documentation.

## File Handling Configuration

### maxFileSize

**Purpose:** Maximum file upload size in bytes.

**Default:** 10485760 (10 MB)

**Usage:** Enforced by Multer middleware.

**Example:**
```json
{
  "maxFileSize": 52428800  // 50 MB
}
```

### fileTTLSeconds

**Purpose:** Time-to-live for uploaded files before automatic cleanup.

**Default:** 604800 (7 days = 7 * 24 * 60 * 60)

**Usage:** Sweep job deletes files older than this value.

**Example:**
```json
{
  "fileTTLSeconds": 2592000  // 30 days
}
```

**See Also:** [FILE_HANDLING.md](FILE_HANDLING.md) for file cleanup details.

## Port Configuration

### port

**Purpose:** HTTP server listening port.

**Default:** 31000

**Usage:** Server binds to this port on startup.

**Example:**
```json
{
  "port": 8080
}
```

**Note:** Ensure the port is not already in use and is accessible through firewalls.

## Client Configuration

### quickAnswersPreset

**Purpose:** Predefined quick reply messages for the UI.

**Default:** `["Hello! Thanks for reaching out!"]`

**Usage:** Exposed via `/api/v1/getClientConfig` for frontend consumption.

**Example:**
```json
{
  "quickAnswersPreset": [
    "Hello! Thanks for reaching out!",
    "I'll help you with that right away.",
    "Could you provide more details?",
    "Thanks for your patience."
  ]
}
```

## Configuration Loading Process

### Startup Sequence

1. **Load server.json:** Parse server configuration
2. **Load client.json:** Parse client configuration
3. **Validate webhooks:** Check webhook configuration format
4. **Check FILE_SIGNING_SECRET:** Warn if missing
5. **Create uploads directory:** Ensure `public/uploads/` exists
6. **Start server:** Bind to configured port

### Error Handling

- **Missing config files:** Application crashes with clear error
- **Invalid JSON:** Application crashes with parse error
- **Invalid webhooks:** Logged and skipped (non-fatal)
- **Missing FILE_SIGNING_SECRET:** Warning logged, uploads disabled

## Development vs Production

### Development

**server.json:**
```json
{
  "port": 31000,
  "apiKeys": ["dev-key-123"],
  "maxFileSize": 104857600,  // 100 MB for testing
  "fileTTLSeconds": 86400,    // 1 day for faster cleanup
  "webhooks": []
}
```

**Environment:**
```bash
FILE_SIGNING_SECRET=dev-secret-key
NODE_ENV=development
```

### Production

**server.json:**
```json
{
  "port": 31000,
  "apiKeys": ["prod-key-abc", "prod-key-xyz"],
  "maxFileSize": 10485760,    // 10 MB
  "fileTTLSeconds": 604800,   // 7 days
  "webhooks": [
    {
      "url": "https://your-domain.com/webhook",
      "headers": {
        "Authorization": "Bearer webhook-secret"
      },
      "retry": {
        "attempts": 5,
        "delay_ms": 5000
      }
    }
  ]
}
```

**Environment:**
```bash
FILE_SIGNING_SECRET=<strong-random-key>
NODE_ENV=production
```

## Related Files

- **Server Config:** `config/server.json`
- **Client Config:** `config/client.json`
- **Implementation:** `src/index.ts` (lines 127-187)
- **API Key Middleware:** `src/index.ts` (lines 334-350)
- **Webhook Loading:** `src/index.ts` (lines 148-187)

## See Also

- [FILE_HANDLING.md](FILE_HANDLING.md) - File upload and storage configuration
- [WEBHOOKS.md](WEBHOOKS.md) - Webhook configuration details
- [API_STRUCTURE.md](API_STRUCTURE.md) - API endpoint documentation