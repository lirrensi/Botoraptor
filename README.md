# ChatLayer

**Human-in-the-loop conversation middleware for customer-facing bots**

ChatLayer is an independent component that logs all incoming messages from your bots and provides a web interface for managers to monitor conversations and send messages back. Initially built for Telegram, it works with any bot platform.

---

## The Problem It Solves

Most bot frameworks provide no built-in interface for monitoring customer conversations or allowing human operators to intervene. ChatLayer fills this gap with a simple, self-contained solution that you can deploy on your own premises.

---

## What's Included

- **Server** - Node.js + Express with SQLite database
- **Web UI** - Manager-facing interface (Vue 3 + Ionic)
- **SDKs** - Node.js/Web and Python clients for easy integration

---

## How It Works

```
┌─────────────┐         SDK          ┌──────────────┐
│   Your Bot  │ ───────────────────► │ ChatLayer    │
│ (Telegram,  │   send messages      │   Server     │
│ Discord,    │                       │              │
│ WhatsApp...)│◄──────────────────────┤              │
└─────────────┘   listen for msgs    │    + SQLite  │
                                          Database   │
┌─────────────┐                        │              │
│   Manager   │ ◄─────────────────────┤              │
│  Web UI     │   view & send msgs    └──────────────┘
└─────────────┘
```

1. **Your bot** uses the SDK to send every incoming message to ChatLayer
2. **ChatLayer** stores messages in its database and serves the web UI
3. **Managers** view conversations and send messages through the web interface
4. **Your bot** listens for outgoing messages and delivers them to users

---

## Quick Start

### Option 1: Docker Compose (Recommended for Production)

The easiest way to deploy ChatLayer is using Docker Compose. This will automatically build the frontend, initialize the database, and start the server.

```bash
# 1. Clone the repository
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer

# 2. Configure the server
# Edit server/config/server.json to set your API keys
nano server/config/server.json

# 3. Set environment variables
# Create a .env file in the project root with your file signing secret
echo "FILE_SIGNING_SECRET=your-super-secret-key-here" > .env

# 4. Start with Docker Compose
docker-compose up -d

# 5. Check the logs
docker-compose logs -f chatlayer
```

The server will start on `http://localhost:31000` and serve the web UI at `/`.

**Docker Compose Features:**
- ✅ Automatically builds frontend and backend
- ✅ Initializes database on first run
- ✅ Persists database and uploaded files in Docker volumes
- ✅ Health checks for monitoring
- ✅ Easy configuration via mounted config directory
- ✅ Automatic restart on failure

For detailed Docker deployment instructions, see [DOCKER.md](DOCKER.md).

**Managing the Docker deployment:**
```bash
# Stop the service
docker-compose down

# View logs
docker-compose logs -f chatlayer

# Rebuild after code changes
docker-compose up -d --build

# Access the container shell
docker-compose exec chatlayer sh
```

### Option 2: Manual Installation (Clone + Run)

For development or custom deployments, you can install and run ChatLayer manually.

#### 1. Clone and Set Up

```bash
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer
```

#### 2. Configure the Server

Edit `server/config/server.json`:

```json
{
  "port": 31000,
  "apiKeys": ["your-secret-api-key-here"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800,
  "webhooks": []
}
```

Set the file signing secret in `server/.env`:

```bash
FILE_SIGNING_SECRET=your-super-secret-key-here
```

#### 3. Build the Frontend

The web UI must be built before starting the server:

```bash
cd web_ui
pnpm install
pnpm run build
cd ..
```

The build process automatically copies the frontend files to `server/public/`.

#### 4. Set Up the Database

Initialize the database using Prisma:

```bash
cd server
pnpm install
pnpm run generate  # Generate Prisma client
pnpm run db:push   # Initialize database schema
```

**Note:** The database file will be created in `server/db/dev.db` (or `main.db` if `NODE_ENV=production`).

#### 5. Start the Server

```bash
# Development mode (with hot reload)
pnpm run dev

# Or production mode
NODE_ENV=production pnpm run start:prod
```

The server will start on `http://localhost:31000` and serve the web UI at `/`.

---

## Integrating with Your Bot

### Node.js / TypeScript

```typescript
import { ChatLayer } from "./chatLayerSDK_node/chatLayerSDK";

const chatLayer = new ChatLayer({
  apiKey: "your-secret-api-key-here",
  baseUrl: "http://localhost:31000",
  botIds: ["my-telegram-bot"],
  listenerType: "bot"
});

// Send incoming messages to ChatLayer
async function onUserMessage(msg) {
  await chatLayer.addMessage({
    botId: "my-telegram-bot",
    roomId: msg.chatId,
    userId: msg.userId,
    username: msg.username,
    text: msg.text,
    messageType: "user_message"
  });
}

// Listen for messages from managers
chatLayer.onMessage(async (msg) => {
  // Send message to your platform (Telegram, Discord, etc.)
  await sendMessageToUser(msg.roomId, msg.text);
});

chatLayer.start();
```

### Python

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    client = ChatLayer(
        api_key="your-secret-api-key-here",
        base_url="http://localhost:31000",
        bot_ids=["my-telegram-bot"],
        listener_type="bot"
    )

    # Send incoming messages
    await client.add_message({
        "bot_id": "my-telegram-bot",
        "room_id": "chat-123",
        "user_id": "user-456",
        "username": "john_doe",
        "text": "Hello!",
        "message_type": "user_message"
    })

    # Listen for manager messages
    async def on_message(msg):
        await send_to_user(msg.room_id, msg.text)

    client.on_message(on_message)
    client.start()

asyncio.run(main())
```

### Web / Browser

```typescript
import { ChatLayer } from "./chatLayerSDK_node/chatLayerSDK";

const chatLayer = new ChatLayer({
  apiKey: "your-secret-api-key-here",
  baseUrl: "http://localhost:31000",
  listenerType: "ui"
});

chatLayer.onMessage((msg) => {
  displayMessage(msg);
});

chatLayer.start();
```

---

## Message Types

ChatLayer supports different message types to distinguish the source:

| Type | Description |
|------|-------------|
| `user_message` | User typed a message to the bot |
| `user_message_service` | User interaction with bot features |
| `bot_message_service` | Automated bot response |
| `manager_message` | Message from a human operator |
| `service_call` | Special event requesting human takeover |

---

## Web UI Features

- **Conversation List** - View all active conversations
- **Message History** - Full chat history with filtering by message type
- **Send Messages** - Compose and send messages as a manager
- **File Attachments** - Upload and send images, videos, documents
- **Quick Replies** - Predefined response templates
- **User Management** - View and block users

The web UI is designed to be embedded in your trusted area as an iframe or locked-down application.

---

## API Endpoints

All endpoints (except `/health` and `/api/v1/getClientConfig`) require API key authentication.

### Messages

- `POST /api/v1/addMessage` - Create a new message
- `POST /api/v1/addMessageSingle` - Create message with file upload
- `GET /api/v1/getMessages` - Fetch messages with pagination
- `GET /api/v1/getUpdates` - Long-polling for real-time updates

### Files

- `POST /api/v1/uploadFile` - Upload files
- `POST /api/v1/uploadFileByURL` - Upload files from URLs

### Users & Rooms

- `POST /api/v1/addUser` - Create or retrieve a user
- `GET /api/v1/getBots` - List all bot IDs
- `GET /api/v1/getRooms` - Get room information

### Configuration

- `GET /api/v1/getClientConfig` - Get client configuration

### Authentication

API keys can be provided in three ways:

```http
Authorization: Bearer your-api-key
x-api-key: your-api-key
?api_key=your-api-key
```

---

## Architecture

### Server

- **Framework**: Express.js with TypeScript
- **Database**: SQLite via Prisma ORM
- **File Storage**: Local filesystem in `public/uploads/`
- **Real-time**: Custom long-polling implementation
- **Webhooks**: Configurable outbound webhooks for events

### Web UI

- **Framework**: Vue 3 + Ionic
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Features**: Real-time updates, file uploads, message filtering

### SDKs

- **Node.js/Web**: TypeScript, zero dependencies
- **Python**: Async-first with httpx and Pydantic

---

## Deployment

### Self-Contained Deployment

ChatLayer is designed to be self-contained:

1. **Database**: SQLite file in `server/db/` (no external database needed)
2. **Web App**: Served directly by the Express server
3. **File Storage**: Local filesystem

### Production Checklist

- [ ] Change default API keys in `config/server.json`
- [ ] Set a strong `FILE_SIGNING_SECRET` in `.env` (or Docker environment)
- [ ] Configure appropriate `maxFileSize` and `fileTTLSeconds`
- [ ] Set up webhooks if needed
- [ ] Deploy behind a reverse proxy (nginx, Apache)
- [ ] Enable HTTPS
- [ ] Restrict web UI access to trusted network or use authentication
- [ ] Set up proper backup strategy for database and uploaded files
- [ ] Configure log rotation and monitoring
- [ ] Review and adjust resource limits (CPU, memory)

### Docker Deployment

For Docker deployment, use the provided Docker Compose setup (see Quick Start - Option 1). The Docker Compose configuration includes:

- **Multi-stage build** - Builds both frontend and backend efficiently
- **Volume persistence** - Database and uploaded files persist across container restarts
- **Health checks** - Automatic monitoring of service health
- **Configuration mounting** - Easy updates to `server/config/` without rebuilding
- **Production-ready** - Optimized for production use with proper environment variables

**Custom Docker Build:**

If you need to build the Docker image directly (without Compose):

```bash
# Build the image
docker build -f server/Dockerfile -t chatlayer:latest .

# Run the container
docker run -d \
  --name chatlayer \
  -p 31000:31000 \
  -e FILE_SIGNING_SECRET=your-secret-key \
  -v $(pwd)/server/config:/app/config:ro \
  -v chatlayer_db:/app/db \
  -v chatlayer_uploads:/app/public/uploads \
  chatlayer:latest
```

---

## Configuration

### Server Configuration (`config/server.json`)

```json
{
  "port": 31000,
  "apiKeys": ["key1", "key2"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800,
  "webhooks": [
    {
      "url": "https://your-domain.com/webhook",
      "headers": {
        "Authorization": "Bearer webhook-secret"
      },
      "retry": {
        "attempts": 3,
        "delay_ms": 3000
      }
    }
  ]
}
```

### Client Configuration (`config/client.json`)

```json
{
  "quickAnswersPreset": [
    "Hello! Thanks for reaching out!",
    "I'll help you with that right away.",
    "Could you provide more details?"
  ]
}
```

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
  attachments?: Array<{
    id: string;
    type: "image" | "video" | "document" | "file";
    url: string;
    filename?: string;
  }>;
  meta?: Record<string, any>;
  createdAt: Date;
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

## Development

### Server

```bash
cd server
pnpm install
pnpm run generate     # Generate Prisma client (required after schema changes)
pnpm run db:push      # Initialize/update database schema
pnpm run dev          # Start development server
pnpm run build        # Build TypeScript
pnpm test:dev         # Run tests
pnpm run db:studio    # Open Prisma Studio
```

**Important:** After cloning the repository or pulling changes, always run `pnpm run generate` and `pnpm run db:push` to ensure the Prisma client is generated and the database schema is up to date.

### Web UI

```bash
cd web_ui
pnpm install
pnpm run dev          # Start development server (with hot reload)
pnpm run build        # Build for production (copies to server/public/)
```

**Important:** The `pnpm run build` command automatically copies the built frontend files to `server/public/`. You must build the frontend before starting the production server, or the web UI will not be available.

### Full Stack Development

For development with both frontend and backend hot reload:

```bash
# Terminal 1: Start server
cd server
pnpm run dev

# Terminal 2: Start frontend dev server
cd web_ui
pnpm run dev
```

Note: When running the frontend dev server separately, it runs on a different port (usually 5173) and proxies API requests to the backend. For production deployment, always build the frontend with `pnpm run build` so it's served by the backend server.

### SDKs

```bash
cd chatLayerSDK_node
pnpm test             # Run tests

cd chatLayerSDK_python
pip install -e ".[dev]"
pytest                # Run tests
```

---

## Security Considerations

- **API Keys**: Change default keys and rotate periodically
- **File Uploads**: All file access requires signed URLs
- **Web UI**: Intended for trusted networks; consider additional authentication
- **HTTPS**: Use HTTPS in production
- **Environment Variables**: Never commit `.env` files or secrets

---

## Platform Support

ChatLayer is platform-agnostic. It works with any bot that can make HTTP requests:

- ✅ Telegram
- ✅ Discord
- ✅ WhatsApp
- ✅ Slack
- ✅ Custom web chat
- ✅ Any other platform

---

## License

MIT

---

## Support

- **Server Documentation**: See `server/docs/` for detailed API docs
- **SDK Documentation**: See `chatLayerSDK_node/README.md` and `chatLayerSDK_python/README.md`
- **Web UI Documentation**: See `web_ui/README.md`