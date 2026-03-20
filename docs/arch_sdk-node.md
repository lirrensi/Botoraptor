# Node SDK Architecture

TypeScript SDK for Botoraptor — zero dependencies, works in Node.js and browsers.

---

## Overview

A lightweight client for integrating bots and web applications with Botoraptor. Uses native `fetch` API.

Public docs now prefer `Botoraptor`, while the legacy `ChatLayer` export remains available as a compatibility alias.

**Scope Boundary:**

- **This component owns**: HTTP communication, response normalization, long-polling loop
- **This component does NOT own**: Message storage, UI rendering, bot logic
- **Boundary interfaces**: Calls Botoraptor server REST API

---

## Installation

```bash
pnpm add chatlayer-sdk
```

Or copy `chatLayerSDK.ts` directly into your project.

---

## Quick Start

```typescript
import Botoraptor from '../chatLayerSDK_node/botoraptor';

const client = new Botoraptor({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:31000',
  botIds: ['my-bot'],
  listenerType: 'bot',
});

// Listen for messages
client.onMessage((msg) => {
  console.log('Received:', msg.text);
});

// Start polling
client.start();

// Send a message
await client.addMessage({
  botId: 'my-bot',
  roomId: 'room-123',
  userId: 'user-456',
  text: 'Hello!',
});
```

---

## Configuration

```typescript
interface BotoraptorConfig {
  apiKey: string;              // Required
  baseUrl?: string;            // Default: "/"
  botIds?: string[];           // Bot IDs to listen for
  listenerType?: 'bot' | 'ui'; // Default: "bot"
  timeoutMs?: number;          // Default: 60000
  pollDelayMs?: number;        // Default: 1000
  onError?: (err: any) => void;
}
```

---

## Core Methods

### Message Operations

| Method | Description |
|--------|-------------|
| `addMessage(msg)` | Send a message |
| `addManagerMessage(msg)` | Send as manager (sets `messageType: 'manager_message'`) |
| `sendServiceAlert(msg)` | Send system alert (sets `messageType: 'service_call'`) |
| `getMessages(params)` | Fetch messages with pagination |

### File Operations

| Method | Description |
|--------|-------------|
| `uploadFileWeb(file, options)` | Upload File/Blob (browser) |
| `uploadFileBuffer(buffer, options)` | Upload Buffer (Node.js) |
| `uploadFileByURL(files)` | Upload from URLs |
| `addMessageSingle(msg, file, options)` | Send message with file in one request |

### Query Operations

| Method | Description |
|--------|-------------|
| `getBots()` | List all bot IDs |
| `getRooms(params)` | Get room information |
| `getClientConfig()` | Get client configuration |

### Real-time

| Method | Description |
|--------|-------------|
| `onMessage(callback)` | Register message handler |
| `start(opts?)` | Start long-polling |
| `stop()` | Stop polling |

---

## Types

```typescript
interface Message {
  id?: string;
  botId: string;
  roomId: string;
  userId: string;
  username?: string;
  text?: string;
  messageType?: MessageType;
  attachments?: Attachment[];
  meta?: Record<string, any>;
  createdAt?: string;
}

interface Attachment {
  id?: string;
  type: 'image' | 'video' | 'document' | 'file';
  url?: string;
  filename?: string;
  mime_type?: string;
  size?: number;
}

type MessageType =
  | 'user_message'
  | 'user_message_service'
  | 'bot_message_service'
  | 'manager_message'
  | 'service_call';
```

---

## Long-Polling

The SDK handles long-polling automatically:

```typescript
client.onMessage((msg) => {
  // Handle incoming message
});

client.start();  // Begins polling

// Later...
client.stop();   // Stops polling
```

**Behavior:**
- Polls `/api/v1/getUpdates` endpoint
- Exponential backoff on errors (1s → 1.5s → ... → 30s max)
- Graceful abort on `stop()`

---

## Error Handling

```typescript
const client = new Botoraptor({
  apiKey: 'key',
  onError: (err) => {
    console.error('Botoraptor error:', err);
  },
});

// Or wrap calls in try/catch
try {
  await client.addMessage(msg);
} catch (error) {
  console.error('Failed:', error.message);
}
```

---

## Environment Support

| Feature | Node.js | Browser |
|---------|---------|---------|
| Basic API calls | ✅ | ✅ |
| File uploads (File/Blob) | ❌ | ✅ |
| File uploads (Buffer) | ✅ | ❌ |
| Long-polling | ✅ | ✅ |

**Requirements:**
- Node.js 18+ (for native `fetch`)
- Modern browsers with ES6 support

---

## API Reference

For complete API details, see [arch_server.md](arch_server.md).

---

## Implementation Pointers

- **SDK file**: `chatLayerSDK_node/chatLayerSDK.ts`
- **Tests**: `chatLayerSDK_node/tests/`
- **No external dependencies**: Uses native `fetch`
