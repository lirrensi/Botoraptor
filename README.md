# Botoraptor

<img src="assets/logo.jpg" alt="Botoraptor logo" width="420" />

## TL;DR - What this thing actually is

Botoraptor is a conversation bridge for bots that do not come with a usable human support inbox.

If your bot lives in Telegram, Discord, WhatsApp, Slack, a custom app, an automation flow, or any other system that can send HTTP requests and receive webhooks, Botoraptor sits in the middle and handles the two-way conversation layer.

- Your bot, server, or automation sends incoming messages into Botoraptor via the SDK or API
- Botoraptor stores the conversation and shows it in a manager-facing web UI
- Human operators reply from that UI
- Botoraptor delivers those replies back to your system through a webhook or SDK listener

So the short version is: your bot keeps doing bot things, and Botoraptor gives it the missing interface for human-in-the-loop messaging.

## Who it's for

Botoraptor is for developers who already have a bot, automation, or backend flow, but do not have a good human-facing conversation UI.

It is especially useful when you need a manager or operator to:

- see what is happening inside bot conversations in a clear interface
- inspect granular events and message flow instead of guessing from logs
- jump in and send messages back to the user from a proper UI
- keep the existing bot stack instead of rebuilding everything around a new platform

## Why it's useful

Many bot frameworks are good at the programmatic side, but they stop short when you need real operational visibility.

Common pain points Botoraptor solves:

- your bot can receive and send messages, but your team has no inbox to monitor conversations
- managers cannot easily step in when automation fails, stalls, or needs a human reply
- message history is scattered across logs, scripts, and platform-specific tools
- every bot platform has its own constraints, but you want one simple middleware layer for all of them

Botoraptor gives your managers a clear UI to watch conversations, understand what happened, and type messages back. Your bot or server then picks up those outgoing messages through a webhook or SDK listener and delivers them to the end user.

## Quick use cases

- `Telegram support bot` - log incoming chats, let managers reply from the web UI, send those replies back through your Telegram bot
- `WhatsApp or Discord bot` - keep your current bot logic, but add a real operations interface for humans
- `Custom backend bot` - push events from your own server, then listen for outbound human replies by webhook
- `Automation tools` - connect webhook-friendly tools like Make or n8n and use Botoraptor as the human conversation layer

Formerly `ChatLayer`

**Human-in-the-loop conversation middleware for customer-facing bots**

Botoraptor logs all incoming messages from your bots and provides a web interface for managers to monitor conversations and send messages back. Works with any bot platform (Telegram, Discord, WhatsApp, Slack, etc.).

Legacy `ChatLayer` names still work inside the repo, but new integrations should use `Botoraptor`.

## Rename Note

`Botoraptor` is the new product name for what was previously called `ChatLayer`.

- New docs, UI text, logs, and public examples use `Botoraptor`
- Legacy code paths and aliases still exist so older integrations do not break all at once
- Some internal folders, package names, or GitHub paths may still contain `ChatLayer` during the transition

## Migration Checklist

If you already used `ChatLayer`, this is the safest way to move over without surprises:

- `Imports` - Prefer `Botoraptor` for new code; old `ChatLayer` imports still work as compatibility aliases
- `Node SDK` - Use `./chatLayerSDK_node/botoraptor` for new integrations instead of importing from `./chatLayerSDK_node/chatLayerSDK`
- `Python SDK` - Use `botoraptor_sdk` and `Botoraptor`; legacy `chatlayer_sdk` remains available
- `Web UI` - The browser now stores API keys under `botoraptor_api_key`, but it still reads legacy `chatlayer_api_key` automatically
- `Docker` - Compose now shows `botoraptor` service/container names, while existing Docker volumes keep legacy names so your data stays in place
- `Logs and docs` - Expect `Botoraptor` in startup logs, OpenAPI docs, and UI titles; that is the same project, just renamed

If something feels "broken" after pulling a newer version, check custom scripts, deployment docs, or local notes for hardcoded `ChatLayer` names first.

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/lirrensi/Botoraptor.git
cd Botoraptor
nano server/config/server.json  # Set API keys
echo "FILE_SIGNING_SECRET=your-secret-key" > .env
docker-compose up -d
```

Server runs at `http://localhost:31000`

### Manual

```bash
git clone https://github.com/lirrensi/Botoraptor.git
cd Botoraptor

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
| **Go SDK** | Thin Go HTTP client for bots and services |
| **PHP SDK** | Drop-in PHP client for bots and services |

---

## Integration Example

```typescript
import { Botoraptor } from "./chatLayerSDK_node/botoraptor";

const botoraptor = new Botoraptor({
  apiKey: "your-api-key",
  baseUrl: "http://localhost:31000",
  botIds: ["my-bot"],
  listenerType: "bot"
});

// Send incoming messages to Botoraptor
async function onUserMessage(msg) {
  await botoraptor.addMessage({
    botId: "my-bot",
    roomId: msg.chatId,
    userId: msg.userId,
    text: msg.text,
    messageType: "user_message"
  });
}

// Listen for manager messages
botoraptor.onMessage((msg) => {
  // Deliver to your platform
  sendMessageToUser(msg.roomId, msg.text);
});

botoraptor.start();
```

---

## Security

Botoraptor v3.1+ includes security hardening:

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
| [docs/arch_sdk-go.md](docs/arch_sdk-go.md) | Go SDK reference |
| [docs/arch_sdk-php.md](docs/arch_sdk-php.md) | PHP SDK reference |

---

## License

MIT
