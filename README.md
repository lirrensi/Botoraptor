# ChatLayer

**Human-in-the-loop conversation middleware for customer-facing bots**

ChatLayer logs all incoming messages from your bots and provides a web interface for managers to monitor conversations and send messages back. Works with any bot platform (Telegram, Discord, WhatsApp, Slack, etc.).

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer
nano server/config/server.json  # Set API keys
echo "FILE_SIGNING_SECRET=your-secret-key" > .env
docker-compose up -d
```

Server runs at `http://localhost:31000`

### Manual

```bash
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer

# Build frontend
cd web_ui && pnpm install && pnpm run build && cd ..

# Setup server
cd server && pnpm install && pnpm run generate && pnpm run db:push

# Configure
nano config/server.json  # Set API keys
echo "FILE_SIGNING_SECRET=your-secret-key" > .env

# Run
pnpm run dev
```

---

## Production Setup

### CORS Configuration (Required for Cross-Origin Deployments)

If hosting the Web UI on a **different domain** than the API server, you **must** configure CORS in `server/config/server.json`:

```json
{
  "corsOrigins": ["https://your-webui-domain.com"]
}
```

- **Empty array `[]`** = CORS disabled (default, for same-origin deployments)
- Add each allowed origin as a string in the array
- The Web UI makes cross-origin requests to the API — without CORS, browsers block these requests

**Same-origin setup** (Web UI and API on same domain): Leave `corsOrigins` empty or omit the field.

---

## What's Included

| Component | Description |
|-----------|-------------|
| **Server** | Node.js + Express with SQLite database |
| **Web UI** | Manager-facing interface (Vue 3 + Ionic) |
| **Node SDK** | TypeScript client for bots and web apps |
| **Python SDK** | Async Python client for bots |

---

## Integration Example

```typescript
import { ChatLayer } from "./chatLayerSDK_node/chatLayerSDK";

const chatLayer = new ChatLayer({
  apiKey: "your-api-key",
  baseUrl: "http://localhost:31000",
  botIds: ["my-bot"],
  listenerType: "bot"
});

// Send incoming messages to ChatLayer
async function onUserMessage(msg) {
  await chatLayer.addMessage({
    botId: "my-bot",
    roomId: msg.chatId,
    userId: msg.userId,
    text: msg.text,
    messageType: "user_message"
  });
}

// Listen for manager messages
chatLayer.onMessage((msg) => {
  // Deliver to your platform
  sendMessageToUser(msg.roomId, msg.text);
});

chatLayer.start();
```

---

## Security

ChatLayer v3.1+ includes security hardening:

- **Rate limiting** on all endpoints
- **SSRF protection** for URL-based file uploads
- **Security headers** via Helmet
- **CORS configuration** required for cross-origin deployments
- **Dangerous file warnings** in the Web UI

See [CHANGELOG.md](CHANGELOG.md) for details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/product.md](docs/product.md) | Product specification |
| [docs/arch_index.md](docs/arch_index.md) | Architecture index |
| [docs/arch_server.md](docs/arch_server.md) | Server architecture & API reference |
| [docs/arch_web-ui.md](docs/arch_web-ui.md) | Web UI architecture |
| [docs/arch_sdk-node.md](docs/arch_sdk-node.md) | Node SDK reference |
| [docs/arch_sdk-python.md](docs/arch_sdk-python.md) | Python SDK reference |

---

## License

MIT
