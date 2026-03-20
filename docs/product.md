# Botoraptor

**Human-in-the-loop conversation middleware for customer-facing bots**

---

## Overview

Botoraptor is an independent component that transparently adds a human-in-the-loop to any bot/automated chat. It logs all incoming messages from your bots and provides a web interface for managers to monitor conversations and send messages back.

Most bot frameworks provide no built-in interface for monitoring customer conversations or allowing human operators to intervene. Botoraptor fills this gap with a simple, self-contained solution that you can deploy on your own premises.

Legacy `ChatLayer` names remain available as compatibility aliases in SDKs and UI storage during the transition.

---

## Features

- **Message Management** — Store and retrieve chat messages with attachments
- **Real-time Updates** — Long-polling for near real-time message delivery
- **File Uploads** — Secure file storage with signed URLs
- **Webhooks** — Outgoing notifications for manager interventions
- **Multi-bot Support** — Handle multiple bots and conversations simultaneously
- **Platform Agnostic** — Works with Telegram, Discord, WhatsApp, Slack, or any platform that can make HTTP requests

---

## Architecture Summary

```
┌─────────────┐         SDK          ┌──────────────┐
│   Your Bot  │ ───────────────────► │ Botoraptor   │
│ (Telegram,  │   send messages      │   Server     │
│ Discord,    │                       │              │
│ WhatsApp...)│◄──────────────────────┤    + SQLite  │
└─────────────┘   listen for msgs    └──────────────┘
                                           │
┌─────────────┐                            │
│   Manager   │ ◄──────────────────────────┘
│  Web UI     │   view & send msgs
└─────────────┘
```

**Components:**

| Component | Description |
|-----------|-------------|
| **Server** | Node.js + Express with SQLite database. Handles API, long-polling, webhooks, file storage. |
| **Web UI** | Vue 3 + Ionic. Manager-facing interface for viewing and responding to conversations. |
| **Node SDK** | TypeScript client for Node.js bots and web apps. |
| **Python SDK** | Async Python client for Python bots. |

---

## How It Works

1. **Your bot** uses the SDK to send every incoming message to Botoraptor
2. **Botoraptor** stores messages in its database and serves the web UI
3. **Managers** view conversations and send messages through the web interface
4. **Your bot** listens for outgoing messages and delivers them to users

---

## Message Types

| Type | Description |
|------|-------------|
| `user_message` | User typed a message to the bot |
| `user_message_service` | User interaction with bot features (button clicks, etc.) |
| `bot_message_service` | Automated bot response |
| `manager_message` | Message from a human operator |
| `service_call` | Special event requesting human takeover |

---

## Data Model

### Message

```typescript
{
  id: string;
  botId: string;
  roomId: string;
  userId: string;
  username: string;
  name?: string;
  text: string;
  messageType: "user_message" | "user_message_service" | "bot_message_service" | "manager_message" | "service_call";
  attachments?: Attachment[];
  meta?: Record<string, any>;
  createdAt: Date;
}
```

### Attachment

```typescript
{
  id: string;
  type: "image" | "video" | "document" | "file";
  url: string;
  filename?: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
}
```

### User

```typescript
{
  botId: string;
  userId: string;
  username: string;
  name?: string;
  blocked: boolean;
  createdAt: Date;
}
```

---

## Configuration

### Server Configuration (`config/server.json`)

```json
{
  "port": 31000,
  "apiKeys": ["your-secret-api-key-here"],
  "corsOrigins": ["https://your-webui-domain.com"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800,
  "webhooks": [
    {
      "url": "https://your-domain.com/webhook",
      "headers": { "Authorization": "Bearer webhook-secret" },
      "retry": { "attempts": 3, "delay_ms": 3000 }
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `port` | Server port (default: 31000) |
| `apiKeys` | Valid API keys for authentication |
| `corsOrigins` | Allowed CORS origins for Web UI (empty = CORS disabled) |
| `maxFileSize` | Max upload size in bytes |
| `fileTTLSeconds` | File lifetime before cleanup |
| `webhooks` | Outgoing webhook configurations |

### Client Configuration (`config/client.json`)

```json
{
  "quickAnswersPreset": [
    "Hello! Thanks for reaching out!",
    "I'll help you with that right away.",
    "Could you provide more details?"
  ],
  "dangerousExtensions": [
    ".exe", ".bat", ".cmd", ".ps1", ".sh", ".js", ".vbs",
    ".jar", ".msi", ".scr", ".pif", ".com", ".lnk"
  ]
}
```

| Field | Description |
|-------|-------------|
| `quickAnswersPreset` | Pre-defined quick reply messages for managers |
| `dangerousExtensions` | File extensions flagged as potentially dangerous in the Web UI |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FILE_SIGNING_SECRET` | Yes | Secret for signing file URLs (HMAC-SHA256) |
| `NODE_ENV` | No | Set to `production` for production mode |
| `API_KEYS` | No | Comma-separated API keys (alternative to config file) |

---

## Quick Start

### Docker Compose (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer
nano server/config/server.json  # Set your API keys
echo "FILE_SIGNING_SECRET=your-secret-key" > .env

# 2. Start
docker-compose up -d

# Server runs at http://localhost:31000
```

### Manual Installation

```bash
# 1. Clone
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer

# 2. Build frontend
cd web_ui && pnpm install && pnpm run build && cd ..

# 3. Setup server
cd server && pnpm install && pnpm run generate && pnpm run db:push

# 4. Configure
nano config/server.json  # Set API keys
echo "FILE_SIGNING_SECRET=your-secret-key" > .env

# 5. Run
pnpm run dev
```

---

## Deployment

### Production Checklist

- [ ] Change default API keys in `config/server.json`
- [ ] Set a strong `FILE_SIGNING_SECRET`
- [ ] Configure appropriate `maxFileSize` and `fileTTLSeconds`
- [ ] Set up webhooks if needed
- [ ] Deploy behind a reverse proxy (nginx, Apache)
- [ ] Enable HTTPS
- [ ] Restrict web UI access to trusted network
- [ ] Set up backup strategy for database and uploads

### Self-Contained Deployment

Botoraptor is designed to be self-contained:

- **Database**: SQLite file in `server/db/` (no external database needed)
- **Web App**: Served directly by the Express server
- **File Storage**: Local filesystem in `public/uploads/`

---

## Security

- **API Keys**: Required for all endpoints except `/health` and `/api/v1/getClientConfig`
- **File Access**: All file access requires signed URLs (HMAC-SHA256) or API key
- **Filename Sanitization**: Server-generated UUIDs prevent path traversal
- **MIME Detection**: From buffer content, not just extension

**Best Practices:**

- Change default API keys in production
- Use strong `FILE_SIGNING_SECRET`
- Enable HTTPS in production
- Rotate secrets periodically
- Never commit secrets to version control

---

## Non-Goals

Botoraptor deliberately does NOT:

- Provide user authentication for the web UI (assumes trusted network)
- Replace your bot framework (works alongside it)
- Handle message delivery to end users (your bot does that)
- Provide analytics or reporting (just message storage and retrieval)

---

## Documentation

| Document | Purpose |
|----------|---------|
| [arch_index.md](arch_index.md) | Component map and navigation |
| [arch_server.md](arch_server.md) | Server architecture and API reference |
| [arch_web-ui.md](arch_web-ui.md) | Web UI architecture |
| [arch_sdk-node.md](arch_sdk-node.md) | Node SDK reference |
| [arch_sdk-python.md](arch_sdk-python.md) | Python SDK reference |

---

## License

MIT
