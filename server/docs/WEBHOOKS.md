# Webhooks

## Overview

ChatLayer supports outgoing webhooks to notify external systems when manager messages are created. Webhooks are configured in `config/server.json` and are triggered asynchronously when messages with `messageType: "manager_message"` are added.

## Webhook Configuration

### server.json

**Location:** `config/server.json`

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

### Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | Webhook endpoint URL |
| `headers` | object | No | `{}` | Custom HTTP headers to send |
| `query` | object | No | `{}` | Query parameters to append to URL |
| `retry.attempts` | number | No | 3 | Number of retry attempts on failure |
| `retry.delay_ms` | number | No | 3000 | Delay between retries (milliseconds) |

### Validation

Webhook configurations are validated at startup:

- **Invalid URL:** Entry is logged and skipped
- **Invalid headers:** Treated as empty object
- **Invalid query:** Treated as empty object
- **Invalid retry:** Falls back to defaults (3 attempts, 3000ms delay)

**Example Validation Error:**
```
Invalid webhook config at index 0 - missing/invalid url. Skipping. Entry: { ... }
```

## Webhook Triggering

### When Webhooks Are Triggered

Webhooks are triggered when:

1. A message is created via `POST /api/v1/addMessage`
2. The message has `messageType: "manager_message"`
3. Webhooks are configured in `server.json`

**Note:** Webhooks are NOT triggered for other message types or when messages are created via `POST /api/v1/addMessageSingle`.

### Trigger Flow

```
Message Created
    ↓
Is messageType == "manager_message"?
    ↓ Yes
Are webhooks configured?
    ↓ Yes
For each webhook:
    ↓
    Build URL with query params
    ↓
    POST with headers and payload
    ↓
    Retry on failure (up to N attempts)
    ↓
    Log success/failure
```

## Webhook Payload

### Payload Format

Webhooks receive a JSON payload with the same signature as the `/api/v1/getUpdates` endpoint:

```json
{
  "success": true,
  "messages": [
    {
      "id": 123,
      "botId": "bot-123",
      "roomId": "room-456",
      "userId": "user-789",
      "messageType": "manager_message",
      "text": "This is a manager intervention",
      "attachments": [
        {
          "id": "uuid-here",
          "type": "image",
          "isExternal": false,
          "filename": "photo.jpg",
          "url": "/uploads/uuid.jpg?exp=1234567890&sig=abc123&filename=photo.jpg"
        }
      ],
      "meta": {
        "priority": "high"
      },
      "createdAt": "2026-01-31T00:00:00.000Z"
    }
  ]
}
```

### Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` |
| `messages` | array | Array of message objects (typically one) |

### Message Object

See [DATA_MODELS.md](DATA_MODELS.md) for complete message structure.

**Key Points:**
- `messageType` is always `"manager_message"`
- `attachments` include signed URLs for internal files
- `meta` contains any custom metadata
- `createdAt` is the message creation timestamp

## HTTP Request Details

### Request Method

```
POST
```

### Content-Type

```
application/json
```

### Headers

Default headers:
```
Content-Type: application/json
```

Custom headers from configuration:
```json
{
  "headers": {
    "Authorization": "Bearer webhook-secret",
    "X-Custom-Header": "custom-value"
  }
}
```

### Query Parameters

Query parameters from configuration are appended to the URL:

**Configuration:**
```json
{
  "query": {
    "source": "chatlayer",
    "environment": "production"
  }
}
```

**Resulting URL:**
```
https://example.com/webhook?source=chatlayer&environment=production
```

### Full Request Example

**Configuration:**
```json
{
  "url": "https://api.example.com/chatlayer/webhook",
  "headers": {
    "Authorization": "Bearer secret-123",
    "X-Webhook-ID": "chatlayer-prod"
  },
  "query": {
    "source": "chatlayer",
    "env": "prod"
  }
}
```

**HTTP Request:**
```http
POST https://api.example.com/chatlayer/webhook?source=chatlayer&env=prod HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer secret-123
X-Webhook-ID: chatlayer-prod

{
  "success": true,
  "messages": [...]
}
```

## Retry Logic

### Retry Behavior

Webhooks are retried on failure:

1. **First attempt:** Immediate
2. **Retry 1:** Wait `delay_ms` milliseconds
3. **Retry 2:** Wait `delay_ms` milliseconds
4. **...and so on** until `attempts` exhausted

### Retry Configuration

```json
{
  "retry": {
    "attempts": 5,
    "delay_ms": 5000
  }
}
```

This configuration:
- Tries up to 5 times total (1 initial + 4 retries)
- Waits 5 seconds between retries
- Total maximum time: ~20 seconds

### Failure Conditions

Webhooks are retried on:

- Network errors (connection refused, timeout, etc.)
- HTTP status codes other than 200 or 204
- Invalid response format

### Success Conditions

Webhooks are considered successful on:

- HTTP status 200 or 204
- Valid response body (any content accepted)

### Retry Example

**Configuration:**
```json
{
  "retry": {
    "attempts": 3,
    "delay_ms": 3000
  }
}
```

**Timeline:**
```
00:00 - Attempt 1: Connection refused
00:03 - Retry 1: HTTP 500
00:06 - Retry 2: HTTP 200 ✓ Success
```

## Asynchronous Execution

### Non-Blocking

Webhook dispatch is asynchronous and does not block the main request flow:

```typescript
// notify longpoll listeners (same routing as /addMessage)
try {
  if (msg.messageType === "manager_message") {
    longPoll.notifyListeners([msg], "bot");
    // send manager_message updates to configured webhooks (bot-side only)
    try {
      void sendToWebhooks({ success: true, messages: [msg] });
    } catch (e) {
      console.error("sendToWebhooks scheduling error", e);
    }
  } else {
    longPoll.notifyListeners([msg], "ui");
  }
} catch (e) {
  console.error("longpoll notify error", e);
}
```

**Key Points:**
- `void sendToWebhooks(...)` - Fire and forget
- Errors logged but don't affect response to client
- Each webhook dispatched independently (parallel execution)

### Parallel Execution

Multiple webhooks are dispatched in parallel:

```typescript
for (const hw of webhooks) {
  // run each webhook dispatch independently (don't block the main request flow)
  (async () => {
    try {
      // ... webhook logic
    } catch (innerErr) {
      console.error("sendToWebhooks internal error for webhook", hw, innerErr);
    }
  })();
}
```

**Benefits:**
- Faster overall webhook delivery
- One slow webhook doesn't block others
- Better resource utilization

## Error Handling

### Server-Side Errors

Errors are logged but don't affect the main request:

```typescript
console.error(`Webhook POST to ${hw.url} attempt ${attempt} returned status ${res?.status}. Response: ${bodyText}`);
```

**Example Log Output:**
```
Webhook POST to https://example.com/webhook attempt 1 returned status 500. Response: Internal Server Error
Webhook POST to https://example.com/webhook attempt 2 failed: ECONNREFUSED
sendToWebhooks internal error for webhook { url: '...' } Error: Invalid URL
```

### Client-Side Errors

Webhook endpoints should:

1. Return 200 or 204 on success
2. Return appropriate error codes on failure (400, 500, etc.)
3. Include error details in response body for debugging

**Example Error Response:**
```json
{
  "error": "Invalid payload",
  "details": "Missing required field: botId"
}
```

## Security Considerations

### Authentication

Use headers to authenticate webhooks:

```json
{
  "headers": {
    "Authorization": "Bearer webhook-secret",
    "X-API-Key": "your-api-key"
  }
}
```

**Best Practices:**
- Use strong, random secrets
- Rotate secrets periodically
- Use different secrets for different environments
- Never commit secrets to version control

### HTTPS

Always use HTTPS URLs for webhooks:

```json
{
  "url": "https://example.com/webhook"
}
```

**Why HTTPS?**
- Encrypts payload in transit
- Prevents man-in-the-middle attacks
- Standard for production systems

### Payload Validation

Webhook endpoints should validate:

- Required fields are present
- Field types are correct
- `messageType` is `"manager_message"`
- `botId`, `roomId`, `userId` are valid

**Example Validation:**
```typescript
function validateWebhookPayload(payload: any): boolean {
  if (!payload.success || !Array.isArray(payload.messages)) {
    return false;
  }

  for (const msg of payload.messages) {
    if (!msg.botId || !msg.roomId || !msg.userId) {
      return false;
    }
    if (msg.messageType !== 'manager_message') {
      return false;
    }
  }

  return true;
}
```

## Use Cases

### 1. Notify Bot Backend

When a manager intervenes, notify the bot backend to pause automation:

```json
{
  "url": "https://bot-backend.example.com/intervention",
  "headers": {
    "Authorization": "Bearer bot-secret"
  }
}
```

**Bot Backend Response:**
```typescript
app.post('/intervention', (req, res) => {
  const { messages } = req.body;
  const msg = messages[0];

  // Pause automation for this room
  pauseAutomation(msg.botId, msg.roomId);

  res.status(200).json({ received: true });
});
```

### 2. Send to Analytics

Track manager interventions for analytics:

```json
{
  "url": "https://analytics.example.com/events",
  "headers": {
    "Authorization": "Bearer analytics-key"
  },
  "query": {
    "event": "manager_intervention"
  }
}
```

### 3. Notify External System

Integrate with external ticketing or CRM systems:

```json
{
  "url": "https://crm.example.com/api/tickets",
  "headers": {
    "Authorization": "Bearer crm-token",
    "Content-Type": "application/json"
  }
}
```

**CRM Integration:**
```typescript
app.post('/api/tickets', (req, res) => {
  const { messages } = req.body;
  const msg = messages[0];

  // Create ticket from manager message
  createTicket({
    title: `Manager Intervention - ${msg.roomId}`,
    description: msg.text,
    botId: msg.botId,
    userId: msg.userId
  });

  res.status(200).json({ ticketId: '12345' });
});
```

## Testing Webhooks

### Local Testing

Use tools like ngrok to test webhooks locally:

```bash
ngrok http 31000
```

**Configuration:**
```json
{
  "url": "https://abc123.ngrok.io/webhook"
}
```

### Webhook Testing Services

Use services like webhook.site for quick testing:

```json
{
  "url": "https://webhook.site/your-unique-id"
}
```

### Manual Testing

Test webhook payload manually:

```bash
curl -X POST https://your-webhook-url.com/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret" \
  -d '{
    "success": true,
    "messages": [{
      "id": 123,
      "botId": "test-bot",
      "roomId": "test-room",
      "userId": "test-user",
      "messageType": "manager_message",
      "text": "Test message",
      "createdAt": "2026-01-31T00:00:00.000Z"
    }]
  }'
```

## Monitoring and Debugging

### Logging

All webhook attempts are logged:

```
Webhook POST to https://example.com/webhook attempt 1 returned status 200. Response: OK
Webhook POST to https://example.com/webhook attempt 1 returned status 500. Response: Internal Server Error
Webhook POST to https://example.com/webhook attempt 2 failed: ECONNREFUSED
```

### Monitoring

Monitor webhook delivery:

- Success rate (200/204 responses)
- Failure rate (other status codes)
- Retry attempts
- Response times

### Debugging Tips

1. **Check logs** for webhook attempts and responses
2. **Verify URL** is accessible from server
3. **Test payload** manually with curl
4. **Check authentication** headers are correct
5. **Verify retry configuration** is appropriate

## Related Files

- **Implementation:** `src/index.ts` (lines 148-277)
- **Configuration:** `config/server.json`
- **Message Controller:** `src/controllers/messageController.ts`

## See Also

- [CONFIGURATION.md](CONFIGURATION.md) - Webhook configuration details
- [API_STRUCTURE.md](API_STRUCTURE.md) - Message creation endpoint
- [DATA_MODELS.md](DATA_MODELS.md) - Message types and structure