# Long Polling

## Overview

ChatLayer uses long-polling to provide real-time message updates to clients without requiring WebSockets. The system supports two listener roles (bot and ui) and allows filtering by bot IDs.

## How Long Polling Works

Long-polling is a technique where the client sends a request and the server holds it open until:
1. New data is available, OR
2. A timeout expires

This provides near real-time updates while using standard HTTP requests.

## Architecture

### Listener Types

The system supports two listener roles:

| Role | Description | Receives |
|------|-------------|----------|
| `"bot"` | Bot-side listeners | `manager_message` type messages |
| `"ui"` | UI-side listeners | All other message types |

### Message Routing

Messages are routed to listeners based on their `messageType`:

- **`manager_message`** → Notified to `"bot"` listeners
- **All other types** → Notified to `"ui"` listeners

**Example:**
```typescript
// When a manager_message is created
if (msg.messageType === "manager_message") {
  longPoll.notifyListeners([msg], "bot");  // Notify bot listeners
} else {
  longPoll.notifyListeners([msg], "ui");   // Notify UI listeners
}
```

### Bot ID Filtering

Listeners can subscribe to specific bot IDs or all bots:

- **Specific bots:** `["bot-123", "bot-456"]` - Only receives messages for these bots
- **All bots:** `null` or `[]` - Receives messages for all bots

**Example:**
```typescript
// Listen for specific bots
await longPoll.waitForMessages(["bot-123", "bot-456"], 30000, "ui");

// Listen for all bots
await longPoll.waitForMessages(null, 30000, "ui");
```

## API

### LongPollManager Class

**Location:** `src/helpers/logpollManager.ts`

#### waitForMessages

Wait for new messages matching the specified criteria.

```typescript
async waitForMessages(
  botIds?: string[] | null,
  timeoutMs = 30000,
  listenerType: ListenerType = "bot"
): Promise<Message[]>
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `botIds` | `string[] \| null` | `null` | Bot IDs to listen for (null = all bots) |
| `timeoutMs` | `number` | `30000` | Timeout in milliseconds |
| `listenerType` | `"bot" \| "ui"` | `"bot"` | Listener role |

**Returns:** `Promise<Message[]>` - Array of matching messages (empty on timeout)

**Behavior:**
1. Creates a listener with specified criteria
2. Sets timeout to return empty array if no messages arrive
3. Waits for `notifyListeners` to be called
4. Returns filtered messages matching the listener's `botIds`

**Example:**
```typescript
// UI listener waiting for user messages on specific bot
const messages = await longPoll.waitForMessages(
  ["bot-123"],
  30000,
  "ui"
);

// Bot listener waiting for manager messages on all bots
const messages = await longPoll.waitForMessages(
  null,
  60000,
  "bot"
);
```

#### notifyListeners

Notify all listeners of a specific role with new messages.

```typescript
notifyListeners(messages: Message[], listenerType: ListenerType = "bot")
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `messages` | `Message[]` | - | Array of new messages |
| `listenerType` | `"bot" \| "ui"` | `"bot"` | Listener role to notify |

**Behavior:**
1. Gets all listeners of the specified type
2. For each listener:
   - Filters messages by the listener's `botIds` (if specified)
   - If matching messages found:
     - Clears timeout
     - Resolves listener promise with filtered messages
     - Removes listener from active list
   - If no matches:
     - Keeps listener waiting
3. Updates listener list with remaining (unresolved) listeners

**Example:**
```typescript
// Notify UI listeners about new user message
longPoll.notifyListeners([newMessage], "ui");

// Notify bot listeners about new manager message
longPoll.notifyListeners([managerMessage], "bot");
```

## HTTP Endpoint

### GET /api/v1/getUpdates

Long-poll endpoint for real-time message updates.

**Authentication:** Required (API key)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `botIds` | string | No | - | Comma-separated bot IDs to listen for |
| `timeoutMs` | number | No | 30000 | Timeout in milliseconds |
| `listenerType` | string | No | "bot" | Listener role (`"bot"` or `"ui"`) |

**Example Requests:**

```bash
# Listen for specific bots as UI listener
GET /api/v1/getUpdates?botIds=bot-123,bot-456&timeoutMs=60000&listenerType=ui

# Listen for all bots as bot listener
GET /api/v1/getUpdates?timeoutMs=30000&listenerType=bot
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

**Timeout Response:**

```json
{
  "success": true,
  "messages": []
}
```

**Behavior:**
1. Parses query parameters
2. Calls `longPoll.waitForMessages()` with specified criteria
3. Waits for messages or timeout
4. Returns messages array (empty on timeout)
5. Populates signed URLs for attachments

**Implementation:** `src/index.ts` (lines 10250-10300)

## Usage Patterns

### UI Client (Frontend)

```typescript
async function listenForMessages(botId: string) {
  while (true) {
    try {
      const response = await fetch(
        `/api/v1/getUpdates?botIds=${botId}&timeoutMs=30000&listenerType=ui`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.messages.length > 0) {
        // Process new messages
        data.messages.forEach(msg => {
          displayMessage(msg);
        });
      }

      // Continue polling (loop repeats)
    } catch (error) {
      console.error('Polling error:', error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

### Bot Client (Backend)

```typescript
async function listenForManagerMessages() {
  while (true) {
    try {
      const response = await fetch(
        `/api/v1/getUpdates?timeoutMs=60000&listenerType=bot`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.messages.length > 0) {
        // Process manager messages
        data.messages.forEach(msg => {
          if (msg.messageType === 'manager_message') {
            handleManagerIntervention(msg);
          }
        });
      }

      // Continue polling
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

## Listener Lifecycle

### Registration

1. Client calls `/api/v1/getUpdates`
2. Server creates listener with specified criteria
3. Listener added to appropriate role list (`bot` or `ui`)
4. Timeout set to return empty array if no messages

### Notification

1. New message created via `/api/v1/addMessage`
2. Server determines listener type based on `messageType`
3. Server calls `longPoll.notifyListeners(messages, listenerType)`
4. For each listener:
   - Filter messages by `botIds` (if specified)
   - If matches: resolve promise, remove listener
   - If no matches: keep listener waiting

### Cleanup

- Listener removed when:
  - Matching messages arrive and promise resolved
  - Timeout expires and empty array returned
  - Error occurs during notification

## Performance Considerations

### Timeout Values

- **Short timeout (5-10s):** Faster response to errors, more frequent requests
- **Long timeout (30-60s):** Fewer requests, better battery life on mobile
- **Recommended:** 30 seconds for UI, 60 seconds for bots

### Connection Limits

- Each long-poll request holds a connection open
- Consider connection limits on your server
- Implement exponential backoff on errors

### Bot ID Filtering

- Use specific `botIds` when possible to reduce unnecessary notifications
- UI clients typically listen for specific bots
- Bot clients may listen for all bots

## Error Handling

### Client-Side

```typescript
try {
  const response = await fetch('/api/v1/getUpdates?...');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  // Process messages
} catch (error) {
  console.error('Polling error:', error);
  // Implement retry logic with exponential backoff
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### Server-Side

- Invalid listener types default to `"bot"`
- Invalid `botIds` arrays are treated as `null` (all bots)
- Listener errors are caught and logged
- Failed listeners are removed from active list

## Security

### Authentication

- All `/api/v1/getUpdates` requests require valid API key
- API key validated via middleware before long-poll starts

### Message Filtering

- Listeners only receive messages for their specified `botIds`
- Listener type determines which message types they receive
- No cross-role message leakage

## Comparison with Alternatives

### vs WebSockets

| Aspect | Long Polling | WebSockets |
|--------|--------------|------------|
| Complexity | Simple (HTTP) | Complex (protocol) |
| Firewall Friendly | Yes | Sometimes blocked |
| Server Resources | Higher (connections held) | Lower (persistent) |
| Bidirectional | No | Yes |
| Latency | Higher (timeout) | Lower (instant) |

**Why Long Polling?**
- Simpler to implement and debug
- Works through most firewalls/proxies
- Sufficient for ChatLayer's use case
- No need for bidirectional communication

### vs Server-Sent Events (SSE)

| Aspect | Long Polling | SSE |
|--------|--------------|-----|
| Browser Support | Universal | Good (IE11+) |
| Bidirectional | No | No |
| Server Complexity | Simple | Moderate |
| Client Complexity | Simple | Simple |

**Why Long Polling?**
- Universal browser support
- No special server infrastructure needed
- Easy to implement retry logic

## Related Files

- **Implementation:** `src/helpers/logpollManager.ts`
- **API Endpoint:** `src/index.ts` (lines 10250-10300)
- **Message Controller:** `src/controllers/messageController.ts`

## See Also

- [API_STRUCTURE.md](API_STRUCTURE.md) - API endpoint documentation
- [DATA_MODELS.md](DATA_MODELS.md) - Message types and routing
- [CONFIGURATION.md](CONFIGURATION.md) - API key authentication