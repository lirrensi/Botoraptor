# Python SDK Architecture

Async Python SDK for Botoraptor — httpx + pydantic.

---

## Overview

An async-first Python client for integrating bots with Botoraptor. Uses `httpx` for HTTP and `pydantic` for type validation.

Public docs now prefer `Botoraptor`, while the legacy `chatlayer_sdk` package remains available as a compatibility alias.

**Scope Boundary:**

- **This component owns**: HTTP communication, response parsing, async polling loop
- **This component does NOT own**: Message storage, bot logic
- **Boundary interfaces**: Calls Botoraptor server REST API

---

## Installation

```bash
pip install chatlayer-sdk
```

---

## Quick Start

```python
import asyncio
from botoraptor_sdk import Botoraptor

async def main():
    client = Botoraptor(
        api_key="your-api-key",
        base_url="http://localhost:31000",
        bot_ids=["my-bot"],
        listener_type="bot",
    )

    # Listen for messages
    async def on_message(msg):
        print(f"Received: {msg.text}")

    client.on_message(on_message)
    client.start()

    # Send a message
    await client.add_message({
        "bot_id": "my-bot",
        "room_id": "room-123",
        "user_id": "user-456",
        "text": "Hello!",
    })

    # Run for a while
    await asyncio.sleep(60)

    client.stop()
    await client.close()

asyncio.run(main())
```

---

## Configuration

```python
from botoraptor_sdk import Botoraptor, BotoraptorConfig

config = BotoraptorConfig(
    api_key="your-api-key",
    base_url="https://api.example.com",
    bot_ids=["bot-1", "bot-2"],
    listener_type="bot",
    timeout_ms=60000,
    poll_delay_ms=1000,
)

client = Botoraptor(**config.model_dump())
```

---

## Core Methods

### Message Operations

| Method | Description |
|--------|-------------|
| `add_message(msg)` | Send a message |
| `add_manager_message(msg)` | Send as manager |
| `send_service_alert(msg)` | Send system alert |
| `get_messages(params)` | Fetch messages with pagination |

### File Operations

| Method | Description |
|--------|-------------|
| `upload_file(bytes, options)` | Upload file bytes |
| `upload_file_by_url(files)` | Upload from URLs |
| `add_message_single(msg, file, options)` | Send message with file |

### Query Operations

| Method | Description |
|--------|-------------|
| `get_bots()` | List all bot IDs |
| `get_rooms(params)` | Get room information |
| `get_client_config()` | Get client configuration |

### Real-time

| Method | Description |
|--------|-------------|
| `on_message(callback)` | Register async message handler |
| `start()` | Start long-polling |
| `stop()` | Stop polling |

---

## Types

```python
from botoraptor_sdk import Message, Attachment, User, MessageType

# Message
message = Message(
    bot_id="bot-1",
    room_id="room-1",
    user_id="user-1",
    username="john_doe",
    text="Hello world",
    message_type=MessageType.USER_MESSAGE,
)

# Attachment
attachment = Attachment(
    type=AttachmentType.IMAGE,
    url="https://example.com/image.jpg",
    filename="photo.jpg",
)
```

---

## Context Manager

Recommended for proper resource cleanup:

```python
async with Botoraptor(api_key="key", base_url="...") as client:
    message = await client.add_message({...})
    # Automatic cleanup on exit
```

---

## Long-Polling

```python
async def handle_message(msg):
    print(f"New message: {msg.text}")

client.on_message(handle_message)
client.start()

# Later...
client.stop()
await client.close()
```

**Behavior:**
- Async polling loop runs in background
- Exponential backoff on errors
- Graceful shutdown on `stop()`

---

## Error Handling

```python
from botoraptor_sdk import BotoraptorError, BotoraptorAPIError

try:
    await client.add_message(msg)
except BotoraptorAPIError as e:
    print(f"API error {e.status_code}: {e.response_text}")
except BotoraptorError as e:
    print(f"SDK error: {e}")
```

---

## Requirements

- Python 3.10+
- `httpx` — HTTP client
- `pydantic` — Data validation

---

## API Reference

For complete API details, see [arch_server.md](arch_server.md).

---

## Implementation Pointers

- **SDK package**: `chatLayerSDK_python/chatlayer_sdk/`
- **Models**: `chatlayer_sdk/models.py`
- **Client**: `chatlayer_sdk/client.py`
