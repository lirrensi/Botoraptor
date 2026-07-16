---
node_type: architecture
title: Server Architecture (legacy flat)
status: archived
updated: 2026-07-16
tags: [server, architecture, legacy]
links:
  supersedes: [/core/server.md]
---

# Server Architecture

Backend API for Botoraptor — Express.js + TypeScript + SQLite.

---

## Overview

The server is a self-contained REST API that handles message storage, real-time updates via long-polling, webhook dispatch, and file uploads. It serves the Web UI as static files.

Public branding uses `Botoraptor`; some internal paths and compatibility aliases still retain `ChatLayer` naming during the transition.

**Scope Boundary:**

- **This component owns**: HTTP routing, message CRUD, long-polling connections, webhook dispatch, file storage, database operations
- **This component does NOT own**: Bot logic, message delivery to end users, UI rendering
- **Boundary interfaces**: Receives messages from SDKs, serves UI to browsers, dispatches webhooks to external services

---snip (full content preserved in archive)---
