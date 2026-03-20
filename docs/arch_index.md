# Architecture Index

## Components

| File | Description |
|------|-------------|
| [arch_server.md](arch_server.md) | Backend API — Express server, SQLite, long-polling, webhooks, file handling |
| [arch_web-ui.md](arch_web-ui.md) | Frontend — Vue 3 + Ionic, state management, routing, deeplinking |
| [arch_sdk-node.md](arch_sdk-node.md) | Node.js/TypeScript SDK — client for bots and web apps |
| [arch_sdk-python.md](arch_sdk-python.md) | Python SDK — async client for Python bots |
| [arch_sdk-go.md](arch_sdk-go.md) | Go SDK — thin HTTP client for bots and services |
| [arch_sdk-php.md](arch_sdk-php.md) | PHP SDK — drop-in client for bots and services |

---

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Systems                        │
│  (Telegram, Discord, WhatsApp, Slack, Custom bots)             │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    │ SDK (Node/Python/Go/PHP)  │ HTTP API
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      arch_server.md                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ REST API    │  │ Long-poll   │  │ Webhooks    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ File Store  │  │ SQLite DB   │  │ Config      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ Serves static files + API
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      arch_web-ui.md                             │
│  Vue 3 + Ionic SPA served by the server                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Component | Language | Framework | Port |
|-----------|----------|-----------|------|
| Server | TypeScript | Express.js | 31000 |
| Web UI | TypeScript | Vue 3 + Ionic | served by server |
| Node SDK | TypeScript | Native fetch | — |
| Python SDK | Python 3.10+ | httpx + pydantic | — |
| Go SDK | Go | net/http | — |
| PHP SDK | PHP | cURL | — |
