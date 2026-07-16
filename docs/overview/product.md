---
node_type: overview
title: Botoraptor Product Overview
status: active
updated: 2026-07-16
tags: [product, overview]
links:
  depends_on: [/ontology.md]
---

# Botoraptor

**Human-in-the-loop conversation middleware for customer-facing bots**

## Overview

Botoraptor is an independent component that transparently adds a human-in-the-loop to any bot or automated chat. It logs all incoming messages from your bots and provides a web interface for managers to monitor conversations and send messages back.

Most bot frameworks provide no built-in interface for monitoring customer conversations or allowing human operators to intervene. Botoraptor fills this gap with a simple, self-contained solution that you can deploy on your own premises.

Legacy `ChatLayer` names remain available as compatibility aliases in SDKs and UI storage during the transition.

## Who It's For

Botoraptor is for developers who already have a bot, automation, or backend flow, but do not have a good human-facing conversation UI. It is especially useful when you need a manager or operator to:

- see what is happening inside bot conversations in a clear interface
- inspect granular events and message flow instead of guessing from logs
- jump in and send messages back to the user from a proper UI
- keep the existing bot stack instead of rebuilding everything around a new platform

## How It Works

1. **Your bot** uses the SDK to send every incoming message to Botoraptor
2. **Botoraptor** stores messages in its database and serves the web UI
3. **Managers** view conversations and send messages through the web interface
4. **Your bot** listens for outgoing messages and delivers them to users

## Components

| Component | Description |
|-----------|-------------|
| **Server** | Node.js + Express with SQLite database. Handles API, long-polling, webhooks, file storage. |
| **Web UI** | Vue 3 + Ionic. Manager-facing interface for viewing and responding to conversations. |
| **Node SDK** | TypeScript client for Node.js bots and web apps. |
| **Python SDK** | Async Python client for Python bots. |
| **Go SDK** | Thin Go HTTP client for bots and services. |
| **PHP SDK** | Drop-in PHP client for bots and services. |

## Core Concepts

### Message Types

| Type | Description |
|------|-------------|
| `user_message` | User typed a message to the bot |
| `user_message_service` | User interaction with bot features (button clicks, etc.) |
| `bot_message_service` | Automated bot response |
| `manager_message` | Message from a human operator |
| `service_call` | Special event requesting human takeover |
| `error_message` | System error or failure notification |

### Data Model

**Message:**
- `id` (Int) — Auto-increment primary key
- `botId` (String) — Bot identifier
- `roomId` (String) — Room/conversation identifier
- `userId` (String) — User identifier
- `text` (String, required) — Message text
- `messageType` (Enum) — One of the message types above
- `attachments` (JSON, optional) — Attachment metadata array
- `meta` (JSON, optional) — Custom metadata
- `createdAt` (DateTime) — Creation timestamp

**Attachment:**
- `id` (String) — Unique ID
- `type` — `image`, `video`, `document`, `file`
- `url` — Access URL (signed)
- `isExternal` (Boolean) — Whether the file is hosted externally
- `filename` — Sanitized filename
- `original_name` — Original uploaded filename
- `mime_type` — Detected MIME type
- `size` — File size in bytes
- `createdAt` — Upload timestamp

**User:**
- `botId` (String) — Bot identifier
- `userId` (String) — User identifier
- `username` (String) — Display name
- `name` (String, optional) — Full name
- `blocked` (Boolean) — Whether user is blocked
- `createdAt` (DateTime) — Creation timestamp

## Non-Goals

Botoraptor deliberately does NOT:

- Provide user authentication for the web UI (assumes trusted network)
- Replace your bot framework (works alongside it)
- Handle message delivery to end users (your bot does that)
- Provide analytics or reporting (just message storage and retrieval)
