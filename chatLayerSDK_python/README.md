# ChatLayer SDK (Python)

A lightweight, async-first Python SDK for integrating with the ChatLayer server. Designed for **both** main web app integrations and external developer usage.

## 📋 Overview

This SDK provides a minimal client with zero runtime dependencies and uses `asyncio` and `httpx` for high-performance async operations. It's perfect for:

- **Web applications** - Browser-based chat interfaces (via server proxy)
- **Python bots** - Server-side automation and message handling
- **Multi-bot management** - Multiple chatbot instances
- **Real-time updates** - Live message streaming via long-polling

**Key Features:**
- Async-first design with `asyncio` and `httpx`
- Type-safe with Pydantic models matching TypeScript schemas
- Single-file SDK (no bundling required)
- Zero dependencies in production (only `httpx` and `pydantic`)
- Comprehensive file upload support
- Automatic response normalization

## 📦 Installation

```bash
pip install chatlayer-sdk
```

Or install with development dependencies:

```bash
pip install -e ".[dev]"
```

## 🚀 Quick Start

### Browser Integration

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    # Initialize client
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com"
    )

    # Send a message
    message = await client.add_message(
        bot_id="my-bot",
        room_id="room-123",
        user_id="user-456",
        text="Hello, world!"
    )
    print(f"Sent message: {message.id}")

    # Cleanup
    await client.close()

asyncio.run(main())
```

### Node.js Bot Integration

```python
import asyncio
from chatlayer_sdk import ChatLayer
import aiofiles

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="http://localhost:3000",
        bot_id="my-bot"
    )

    # Start polling for messages
    client.start()

    # Listen for messages
    async def on_message(msg):
        # Process incoming messages
        print(f"Received: {msg.text}")

        # Send automated responses
        if "help" in msg.text.lower():
            await client.add_message({
                "bot_id": msg.bot_id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "text": "Here's the help information you requested."
            })

    client.on_message(on_message)

    # Run for a while
    await asyncio.sleep(60)

    # Cleanup
    client.stop()
    await client.close()

asyncio.run(main())
```

### File Upload from Disk

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com"
    )

    # Upload file from disk
    with open("image.jpg", "rb") as f:
        file_bytes = f.read()

    attachments = await client.upload_file(
        file_bytes,
        options={
            "type": "image",
            "filename": "uploaded-image.jpg",
            "mime": "image/jpeg"
        }
    )

    # Send message with attachment
    message = await client.add_message({
        "bot_id": "my-bot",
        "room_id": "room-123",
        "user_id": "user-456",
        "text": "Here's an image!",
        "attachments": [{"url": a.url} for a in attachments]
    })

    await client.close()

asyncio.run(main())
```

## 📚 Type Definitions

### Core Types

All types are defined using Pydantic models:

```python
from chatlayer_sdk import (
    Message, User, Attachment,
    MessageType, AttachmentType,
    ChatLayerConfig, FileUploadOptions,
    FileUploadByUrlOptions
)

# Message structure
message = Message(
    bot_id="bot-1",
    room_id="room-1",
    user_id="user-1",
    username="john_doe",
    text="Hello world",
    message_type=MessageType.USER_MESSAGE,
    attachments=[
        Attachment(
            type=AttachmentType.IMAGE,
            url="https://example.com/image.jpg",
            filename="photo.jpg",
            mime_type="image/jpeg"
        )
    ]
)

# User structure
user = User(
    bot_id="bot-1",
    user_id="user-1",
    username="john_doe",
    name="John Doe",
    blocked=False
)

# Configuration
config = ChatLayerConfig(
    api_key="your-api-key",
    base_url="https://api.example.com",
    bot_ids=["bot-1", "bot-2"],
    listener_type="bot",
    timeout_ms=60000,
    poll_delay_ms=1000
)
```

### Type Hints

Full type hints are available for IDE autocomplete:

```python
from chatlayer_sdk import ChatLayer, Message

# Type hints for parameters
async def send_message(client: ChatLayer, msg: Message) -> Message:
    return await client.add_message(msg)

# Return type hints
async def get_messages(client: ChatLayer) -> list[Message]:
    return await client.get_messages(bot_id="bot-1")
```

## ⚙️ Configuration

### Basic Configuration

```python
from chatlayer_sdk import ChatLayer

client = ChatLayer(
    api_key="your-api-key",
    base_url="https://api.example.com"
)
```

### Multiple Bot Support

```python
client = ChatLayer(
    api_key="your-api-key",
    base_url="https://api.example.com",
    bot_ids=["bot-1", "bot-2", "bot-3"],
    listener_type="bot"  # or "ui"
)
```

### Error Handling

```python
client = ChatLayer(
    api_key="your-api-key",
    base_url="https://api.example.com",
)
```

### Context Manager (Recommended)

```python
from chatlayer_sdk import ChatLayer

async with ChatLayer(api_key="key", base_url="https://api.example.com") as client:
    message = await client.add_message(
        bot_id="bot-1",
        room_id="room-1",
        user_id="user-1",
        text="Hello!"
    )
```

## 📡 API Reference

### Message Operations

#### `add_message(msg)`

Send a text message to the server.

**Parameters:**
- `msg` (Message): Message object with `bot_id`, `room_id`, `user_id`, and `text`

**Returns:**
- `Message`: The created message object

```python
message = await client.add_message({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "user_id": "user-456",
    "text": "Hello!"
})

print(f"Message sent: {message.id}")
```

---

#### `add_manager_message(msg)`

Convenience method for manager/human operator messages. Automatically sets `message_type: 'manager_message'`.

**Parameters:**
- `msg` (dict): Message object with `bot_id`, `room_id`, `user_id`, and `text`

**Returns:**
- `Message`: The created message object

```python
response = await client.add_manager_message({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "user_id": "admin",
    "text": "I'm here to help you."
})
```

---

#### `send_service_alert(msg)`

Send a system alert or notification. Automatically sets `message_type: 'service_call'`.

**Parameters:**
- `msg` (dict): Message object with `bot_id`, `room_id`, `user_id`, and `text`

**Returns:**
- `Message`: The created message object

```python
alert = await client.send_service_alert({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "user_id": "system",
    "text": "System maintenance scheduled for tonight."
})
```

---

### File Upload Operations

#### `add_message_single(msg, file_or_files, options)`

Send a message with a single file in the same request (multipart/form-data).

**Parameters:**
- `msg` (Message): Message object
- `file_or_files` (bytes | list[bytes]): File bytes or list of file bytes
- `options` (FileUploadOptions): Upload options including `type`, `filename`, and `mime` (required for Buffer uploads)

**Returns:**
- `list[Attachment]`: List of uploaded attachments

**Browser:** Accepts `bytes` objects  
**Node.js:** Accepts `bytes` objects

```python
message = await client.add_message_single(
    message={
        "bot_id": "bot-1",
        "room_id": "room-123",
        "user_id": "user-456",
        "text": "Check out this image"
    },
    file_or_files=file_bytes,
    options={
        "type": "image",
        "filename": "photo.jpg",
        "mime": "image/jpeg"
    }
)
```

---

#### `upload_file(file_or_files, options)`

Upload files from disk (Buffer/bytes).

**Parameters:**
- `file_or_files` (bytes | list[bytes]): File bytes or list of file bytes
- `options` (FileUploadOptions): Upload options including `type`, `filename`, and `mime` (required for each file)

**Returns:**
- `list[Attachment]`: List of uploaded attachments

**Note:** Requires `options.filename` and `options.type` for each file.

```python
import aiofiles

# Single file
async with aiofiles.open("image.jpg", "rb") as f:
    file_bytes = await f.read()

attachments = await client.upload_file(file_bytes, {
    "type": "image",
    "filename": "uploaded-image.jpg",
    "mime": "image/jpeg"
})

# Multiple files
buffers = [
    await aiofiles.open("photo1.jpg", "rb").read(),
    await aiofiles.open("document.pdf", "rb").read(),
]
attachments = await client.upload_file(buffers, [
    {
        "type": "image",
        "filename": "photo1.jpg",
        "mime": "image/jpeg"
    },
    {
        "type": "document",
        "filename": "document.pdf",
        "mime": "application/pdf"
    }
])
```

---

#### `upload_file_by_url(files)`

Upload files from remote URLs (server downloads and stores them).

**Parameters:**
- `files` (list[FileUploadByUrlOptions]): List of URL upload options

**Returns:**
- `list[Attachment]`: List of uploaded attachments

```python
attachments = await client.upload_file_by_url([
    {
        "url": "https://example.com/image.jpg",
        "filename": "downloaded-image.jpg",
        "type": "image"
    },
    {
        "url": "https://example.com/document.pdf",
        "type": "document"
    }
])
```

---

### Query Operations

#### `get_messages(params)`

Fetch messages with pagination support.

**Parameters:**
- `bot_id` (str): Bot ID (required)
- `room_id` (str): Room ID (required)
- `limit` (int, optional): Maximum number of messages to return. Default: 50
- `cursor_id` (str, optional): Cursor ID from previous response for pagination
- `types` (str, optional): Comma-separated list of message types to filter

**Returns:**
- `list[Message]`: List of messages

**Pagination:**
- Server returns newest-first (descending by `created_at`)
- Use `cursor_id` from the last message you have to fetch older messages

```python
# Get last 20 messages
messages = await client.get_messages({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "limit": 20
})

# Paginate (use cursor_id from previous response)
older_messages = await client.get_messages({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "cursor_id": last_message_id,
    "limit": 20
})

# Filter by message types
user_messages = await client.get_messages({
    "bot_id": "bot-1",
    "room_id": "room-123",
    "types": "user_message,manager_message"
})
```

---

#### `get_bots()`

List all available bot IDs.

**Returns:**
- `list[str]`: List of bot IDs

```python
bots = await client.get_bots()
print(f"Available bots: {bots}")
# Output: ['bot-1', 'bot-2', 'bot-3']
```

---

#### `get_rooms(params)`

Get room information with optional filtering.

**Parameters:**
- `bot_id` (str): Bot ID (required)
- `message_type` (str, optional): Filter by message type in recent messages
- `depth` (int, optional): Number of recent messages to check. Default: 10

**Returns:**
- `list[RoomInfo]`: List of room information objects

```python
# Get all rooms
rooms = await client.get_rooms({
    "bot_id": "bot-1"
})

# Filter by message type in recent messages
error_rooms = await client.get_rooms({
    "bot_id": "bot-1",
    "message_type": "error_message",
    "depth": 10  # Check last 10 messages
})
```

---

#### `get_client_config()`

Retrieve the client configuration object.

**Returns:**
- `dict`: Client configuration

```python
config = await client.get_client_config()
print(f"Client config: {config}")
```

---

### User Management

#### `add_user(user)`

Create or retrieve a user account.

**Parameters:**
- `bot_id` (str): Bot ID (required)
- `user_id` (str): User ID (required)
- `username` (str): Username (required)
- `name` (str, optional): Full name

**Returns:**
- `User`: User account information

```python
user = await client.add_user({
    "bot_id": "bot-1",
    "user_id": "user-123",
    "username": "john_doe",
    "name": "John Doe"
})
```

---

### Real-time Operations

#### `on_message(callback)`

Register a callback for incoming messages.

**Parameters:**
- `callback` (callable): Async function that takes `Message` as parameter

**Returns:**
- `callable`: Unsubscribe function that removes the listener

**Note:** Returns an unsubscribe function that removes the listener.

```python
async def handle_message(msg):
    print(f"New message: {msg.text}")

unsubscribe = client.on_message(handle_message)

# Later, stop listening
unsubscribe()

# Start listening
client.start()
```

**Note:** Multiple `on_message` callbacks can be registered; all will receive messages.

---

#### `start(opts=None)`

Start long-polling for real-time updates.

**Parameters:**
- `opts` (dict, optional): Configuration override for this session
  - `bot_ids` (list[str] | None): Bot IDs to listen for (null = all bots)
  - `listener_type` (str): Listener role ('bot' or 'ui')

```python
# Start with current configuration
client.start()

# Override configuration for this session
client.start({
    "bot_ids": ["bot-1", "bot-2"],  # Listen to specific bots
    "listener_type": "bot"  # Set listener role
})
```

**Note:** `start()` can be called multiple times (reuses existing listeners).

---

#### `stop()`

Stop the polling loop gracefully.

```python
client.start()

# Later, stop polling
client.stop()
```

**Note:** `stop()` gracefully aborts ongoing polling requests.

---

## 🎨 Common Patterns

### Pattern 1: Real-time Message Handler with Auto-Response

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com",
        bot_ids=["my-bot"],
        listener_type="bot"
    )

    async def on_message(msg):
        # Handle incoming message
        print(f"{msg.username}: {msg.text}")

        # Send automated response
        if "help" in msg.text.lower():
            await client.add_message({
                "bot_id": msg.bot_id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "text": "Here are the available commands:\n1. /status - Check bot status\n2. /help - Show this help"
            })

    client.on_message(on_message)
    client.start()

    # Run for a while
    await asyncio.sleep(60)

    client.stop()
    await client.close()

asyncio.run(main())
```

---

### Pattern 2: Web App with File Upload

```python
import asyncio
from chatlayer_sdk import ChatLayer
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI()
client = ChatLayer(
    api_key="your-api-key",
    base_url="https://api.example.com",
    listener_type="ui"
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Read file bytes
    file_bytes = await file.read()

    # Upload file
    attachments = await client.upload_file(
        file_bytes,
        options={
            "type": "image",
            "filename": file.filename
        }
    )

    # Send message with attachment
    message = await client.add_message({
        "bot_id": "chatbot",
        "room_id": "current-room-id",
        "user_id": "current-user-id",
        "text": "Here's an image!",
        "attachments": [{"url": a.url} for a in attachments]
    })

    return {"message_id": message.id}

async def on_message(msg):
    # Display message in UI
    display_message(msg)

client.on_message(on_message)
client.start()
```

---

### Pattern 3: Python Bot with File Processing

```python
import asyncio
from chatlayer_sdk import ChatLayer
import aiofiles
import subprocess

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="http://localhost:3000",
        bot_id="image-bot"
    )

    async def on_message(msg):
        if not msg.text or "process image" not in msg.text.lower():
            return

        # Get attachments from message
        if not msg.attachments or not msg.attachments[0].get("url"):
            await client.add_message({
                "bot_id": msg.bot_id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "text": "Please provide an image to process."
            })
            return

        # Download and process image
        async with aiohttp.ClientSession() as session:
            async with session.get(msg.attachments[0]["url"]) as response:
                image_bytes = await response.read()

        # Save to disk
        async with aiofiles.open(f"processed_{asyncio.get_event_loop().time()}.jpg", "wb") as f:
            await f.write(image_bytes)

        # Process with external tool
        subprocess.run(["magick", "convert", "processed_image.jpg", "-resize", "200x200", "thumbnail.jpg"])

        # Upload processed image
        async with aiofiles.open("thumbnail.jpg", "rb") as f:
            processed_buffer = await f.read()

        attachments = await client.upload_file(
            processed_buffer,
            options={
                "type": "image",
                "filename": "thumbnail.jpg",
                "mime": "image/jpeg"
            }
        )

        # Send result
        await client.add_message({
            "bot_id": msg.bot_id,
            "room_id": msg.room_id,
            "user_id": msg.user_id,
            "text": "Here's your processed image!",
            "attachments": [{"url": a.url} for a in attachments]
        })

    client.on_message(on_message)
    client.start()

    await asyncio.sleep(60)
    client.stop()
    await client.close()

asyncio.run(main())
```

---

### Pattern 4: Multi-Bot Manager

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com",
        bot_ids=["sales-bot", "support-bot", "faq-bot"],
        listener_type="bot"
    )

    # Track active conversations per bot
    active_conversations = {
        "sales-bot": 0,
        "support-bot": 0,
        "faq-bot": 0,
    }

    async def on_message(msg):
        # Increment active conversation count
        if msg.bot_id in active_conversations:
            active_conversations[msg.bot_id] += 1

        # Route messages based on bot
        if msg.bot_id == "sales-bot":
            await handle_sales_message(msg)
        elif msg.bot_id == "support-bot":
            await handle_support_message(msg)
        elif msg.bot_id == "faq-bot":
            await handle_faq_message(msg)

    async def handle_sales_message(msg):
        # Sales bot logic
        reply = await generate_sales_response(msg.text)
        await client.add_message({"bot_id": msg.bot_id, "room_id": msg.room_id, "user_id": msg.user_id, "text": reply})

    async def handle_support_message(msg):
        # Support bot logic
        reply = await generate_support_response(msg.text)
        await client.add_message({"bot_id": msg.bot_id, "room_id": msg.room_id, "user_id": msg.user_id, "text": reply})

    async def handle_faq_message(msg):
        # FAQ bot logic
        reply = await generate_faq_response(msg.text)
        await client.add_message({"bot_id": msg.bot_id, "room_id": msg.room_id, "user_id": msg.user_id, "text": reply})

    client.on_message(on_message)
    client.start()

    # Run for a while
    await asyncio.sleep(60)

    client.stop()
    await client.close()

asyncio.run(main())
```

---

### Pattern 5: Error Handling and Retry

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com"
    )

    async def on_error(error):
        print(f"ChatLayer error: {error}")

        # Log to monitoring service
        await log_to_monitoring_service(error)

        # Retry failed message
        if "addMessage failed" in str(error):
            await retry_failed_message()

    client.on_error(on_error)

async def retry_failed_message():
    # Implement retry logic with exponential backoff
    retries = 3
    while retries > 0:
        try:
            await chatLayer.add_message(failed_message)
            break
        except Exception as e:
            retries -= 1
            await asyncio.sleep(1 * (3 - retries))

async def log_to_monitoring_service(error):
    # Implement logging
    pass

asyncio.run(main())
```

---

### Pattern 6: Message Pagination with Cursor

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def get_all_messages(client: ChatLayer, bot_id: str, room_id: str, batch_size: int = 50) -> list:
    """Fetch all messages with pagination."""
    all_messages = []
    cursor_id = None
    has_more = True

    while has_more:
        batch = await client.get_messages({
            "bot_id": bot_id,
            "room_id": room_id,
            "limit": batch_size,
            "cursor_id": cursor_id,
        })

        all_messages.extend(batch)

        # Check if there are more messages
        if len(batch) < batch_size:
            has_more = False
        else:
            # Use the ID of the last message as the cursor
            cursor_id = batch[-1].id

    return all_messages

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com",
        bot_id="bot-1"
    )

    messages = await get_all_messages(client, "bot-1", "room-123")
    print(f"Total messages: {len(messages)}")

    await client.close()

asyncio.run(main())
```

---

### Pattern 7: Room Management

```python
import asyncio
from chatlayer_sdk import ChatLayer

async def get_active_rooms(client: ChatLayer, bot_id: str):
    """Get all active rooms."""
    rooms = await client.get_rooms({"bot_id": bot_id})
    return rooms

async def find_error_rooms(client: ChatLayer, bot_id: str, depth: int = 10):
    """Find rooms with recent errors."""
    rooms = await client.get_rooms({
        "bot_id": bot_id,
        "message_type": "error_message",
        "depth": depth,
    })

    return [room for room in rooms if room.last_message and "error" in room.last_message.text.lower()]

async def get_room_users(client: ChatLayer, bot_id: str, room_id: str):
    """Get users in a specific room."""
    rooms = await client.get_rooms({"bot_id": bot_id})
    room = next((r for r in rooms if r.room_id == room_id), None)
    return room.users if room else []

async def main():
    client = ChatLayer(
        api_key="your-api-key",
        base_url="https://api.example.com",
        bot_id="bot-1"
    )

    # Get active rooms
    active_rooms = await get_active_rooms(client, "bot-1")
    print(f"Active rooms: {len(active_rooms)}")

    # Find rooms with errors
    error_rooms = await find_error_rooms(client, "bot-1")
    print(f"Rooms with errors: {[r.room_id for r in error_rooms]}")

    # Get room users
    users = await get_room_users(client, "bot-1", "room-123")
    print(f"Room users: {[u.username for u in users]}")

    await client.close()

asyncio.run(main())
```

---

## 🌍 Environment Support

| Feature | Node.js | Browser |
|---------|---------|---------|
| Basic API calls | ✅ | ✅ |
| File uploads (bytes) | ✅ | ✅ (via server proxy) |
| File uploads (URL) | ✅ | ✅ |
| Long-polling | ✅ | ✅ |
| Async/await | ✅ | ✅ |
| aiohttp/httpx | ✅ | ✅ (via server) |

### Python Requirements
- Python 3.8+
- `httpx` for HTTP requests
- `pydantic` for type validation

### Browser Requirements
- Requires server-side proxy for API calls
- Modern browser with ES6+ support
- Async/await support

---

## 🔧 Server Requirements

The ChatLayer server must provide the following API endpoints:

- `POST /api/v1/addMessage` - Send messages
- `POST /api/v1/addMessageSingle` - Send messages with files
- `POST /api/v1/addUser` - Create/retrieve users
- `GET /api/v1/getMessages` - Fetch messages with pagination
- `GET /api/v1/getBots` - List available bots
- `GET /api/v1/getRooms` - Get room information
- `GET /api/v1/getClientConfig` - Get client configuration
- `POST /api/v1/uploadFile` - Upload files
- `POST /api/v1/uploadFileByURL` - Upload files from URLs
- `GET /api/v1/getUpdates` - Long-polling for real-time updates

See the ChatLayer server README for server implementation details.

---

## 📖 Usage Scenarios

### Scenario 1: Main Web Application

```python
import asyncio
from chatlayer_sdk import ChatLayer, Message
from typing import Optional

class ChatInterface:
    """Production-ready chat interface for web applications."""

    def __init__(self, config: dict):
        self.client = ChatLayer.from_config(config)
        self.current_room_id: Optional[str] = None
        self.current_user: Optional[dict] = None

    async def connect(self, bot_id: str, room_id: str, user: dict):
        """Connect to a chat room."""
        self.current_room_id = room_id
        self.current_user = user

        # Listen for incoming messages
        self.client.on_message(self._display_message)

        # Start real-time updates
        self.client.start()

        # Load previous messages
        messages = await self.client.get_messages({
            "bot_id": bot_id,
            "room_id": room_id,
            "limit": 50,
        })

        for msg in messages:
            self._display_message(msg)

    async def send_message(self, text: str):
        """Send a text message."""
        message = await self.client.add_message({
            "bot_id": "main-bot",
            "room_id": self.current_room_id,
            "user_id": self.current_user["id"],
            "text": text,
        })
        self._display_message(message)

    async def upload_image(self, file_bytes: bytes):
        """Upload an image and send with message."""
        attachments = await self.client.upload_file(
            file_bytes,
            options={
                "type": "image",
                "filename": "uploaded_image.jpg",
                "mime": "image/jpeg"
            }
        )

        message = await self.client.add_message({
            "bot_id": "main-bot",
            "room_id": self.current_room_id,
            "user_id": self.current_user["id"],
            "text": "Here's an image!",
            "attachments": [{"url": a.url} for a in attachments]
        })
        self._display_message(message)

    def _display_message(self, msg: Message):
        """Display message in UI."""
        # Render message to UI
        message_element = {
            "username": msg.username,
            "text": msg.text,
            "timestamp": msg.created_at,
        }
        display_message_in_ui(message_element)

# Usage
chat = ChatInterface({
    "api_key": "your-api-key",
    "base_url": "https://api.example.com",
    "listener_type": "ui",
})

await chat.connect("main-bot", "room-123", {"id": "user-456"})
```

---

### Scenario 2: Third-Party Developer Integration

```python
import asyncio
import os
from chatlayer_sdk import ChatLayer

async def main():
    # Initialize SDK with your API key
    client = ChatLayer(
        api_key=os.environ.get("CHATLAYER_API_KEY"),
        base_url="https://api.example.com",
        bot_ids=["your-bot-id"],
    )

    # Set up message handlers
    client.on_message(async def on_message(msg):
        print(f"Received from bot: {msg.bot_id} {msg.text}")

        # Respond to specific keywords
        if "hello" in msg.text.lower():
            await client.add_message({
                "bot_id": msg.bot_id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "text": "Hello! How can I help you today?"
            })

        if "status" in msg.text.lower():
            bots = await client.get_bots()
            await client.add_message({
                "bot_id": msg.bot_id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "text": f"I have access to {len(bots)} bots."
            })

    # Handle file uploads
    client.on_message(async def on_file_upload(msg):
        if msg.get("attachments") and len(msg["attachments"]) > 0:
            for attachment in msg["attachments"]:
                print(f"File uploaded: {attachment.get('url')}")
                # Process the file...

    # Start listening
    client.start()

    print("ChatLayer bot is running...")

    # Run for a while
    await asyncio.sleep(60)

    client.stop()
    await client.close()

asyncio.run(main())
```

---

## 🔒 Error Handling

The SDK throws errors on API failures. Always wrap calls in try/except:

```python
from chatlayer_sdk import ChatLayer, ChatLayerError, ChatLayerAPIError

try:
    message = await client.add_message({
        "bot_id": "bot-1",
        "room_id": "room-123",
        "user_id": "user-456",
        "text": "Hello!",
    })
except ChatLayerAPIError as e:
    print(f"API error {e.status_code}: {e.response_text}")
    # Implement retry logic or notify user
except ChatLayerError as e:
    print(f"SDK error: {e}")
```

**Common Error Messages:**
- `addMessage failed: 401 Unauthorized` - Invalid API key
- `addMessage failed: 404 Not Found` - Bot ID or room ID doesn't exist
- `addMessage error: "message text is required"` - Missing required fields
- `getUpdates failed: 500 Server Error` - Server-side issue

**Error Handling Best Practices:**

1. **Always handle exceptions:**
   ```python
   try:
       await client.add_message(msg)
   except ChatLayerAPIError as e:
       # Handle API errors (401, 404, 500, etc.)
       logger.error(f"API error {e.status_code}: {e.response_text}")
   except ChatLayerError as e:
       # Handle SDK errors
       logger.error(f"SDK error: {e}")
   ```

2. **Implement retry logic:**
   ```python
   async def retry_operation(operation, max_retries=3):
       for attempt in range(max_retries):
           try:
               return await operation()
           except ChatLayerAPIError as e:
               if attempt == max_retries - 1:
                   raise
               await asyncio.sleep(2 ** attempt)  # Exponential backoff
   ```

3. **Log errors for monitoring:**
   ```python
   client.on_error(lambda error: logger.error(f"ChatLayer error: {error}"))
   ```

---

## 📝 Notes

- SDK expects server responses in format: `{"success": bool, "data": any, "errorMessage": str}`
- Relative attachment URLs are automatically normalized to absolute URLs
- Long-polling uses exponential backoff (1s → 1.5s → 2.25s → ... → 30s max)
- Message callbacks don't throw - errors are caught and logged
- Multiple `on_message` callbacks can be registered; all will receive messages
- `start()` can be called multiple times (reuses existing listeners)
- `stop()` gracefully aborts ongoing polling requests
- Context manager (`async with`) ensures proper cleanup of resources
- All async methods should be awaited
- Use `asyncio.run()` to execute top-level async functions in Python 3.7+

---

## 📄 License

ISC

---

## 🤝 Contributing

This SDK is used by both the main web application and external integrators. When contributing:

- Maintain backward compatibility
- Support both async/await patterns
- Include comprehensive type hints
- Provide clear error messages
- Document all methods and options
- Follow PEP 8 style guidelines
- Add tests for new features

### Development Setup

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy chatlayer_sdk

# Linting
ruff check chatlayer_sdk
ruff format chatlayer_sdk
```

---

## 📮 Support

For issues, questions, or contributions:
- Check the API documentation
- Review this README for common patterns
- Report bugs with error messages and stack traces
- Review the Node.js SDK README for additional examples
- Check the ChatLayer server documentation for server requirements

---

## 📚 Additional Resources

- [TypeScript SDK README](../chatLayerSDK_node/README.md) - For comparison and additional examples
- [Pydantic Documentation](https://docs.pydantic.dev/) - For advanced type validation
- [asyncio Documentation](https://docs.python.org/3/library/asyncio.html) - For async programming patterns
- [httpx Documentation](https://www.python-httpx.org/) - For HTTP client usage
