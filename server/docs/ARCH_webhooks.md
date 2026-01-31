# Webhooks Architecture

# Overview
The webhooks system enables real-time notifications to external services when specific events occur in the ChatLayer system. It is designed to be lightweight, configuration-driven, and safe to integrate with third-party systems.

Webhooks are triggered asynchronously when specific messages are created and do not block the main API response. Failures are isolated per-webhook and retried according to configuration.

# Scope

- Configuration: defined in `config.json` under the `webhooks` array
- Trigger source:
  - `manager_message` created via:
    - [`/api/v1/addMessage`](server/src/index.ts:969)
    - [`/api/v1/addMessageSingle`](server/src/index.ts:746)
- Delivery:
  - Outbound HTTP POST requests to configured `url`
  - JSON body aligned with the existing API response shape
- Status handling:
  - Success on HTTP 200 or 204
  - Retry on network or non-2xx/204 responses

# How It Works (High-Level)

1. Your integration calls the ChatLayer API to create a message.
   - When `messageType === "manager_message"`, the message is treated as a manager/bot-side event.
2. The server:
   - Persists the message.
   - Enriches internal attachments with signed URLs (when applicable).
   - Notifies:
     - Long-poll listeners (`listenerType=bot`) and
     - All configured webhooks.
3. For each enabled webhook, the server:
   - Builds the target URL (base `url` + configured `query` params).
   - Merges headers: `Content-Type: application/json` plus any configured `headers`.
   - Sends a JSON POST payload: `{ success: true, messages: [msg] }`.
   - Applies retry behavior if the call fails.
4. The original `/addMessage` or `/addMessageSingle` HTTP response is returned independently of webhook success or failure.

There is no inbound webhook endpoint to configure on ChatLayer; you only configure outbound targets in `config.json`.

# Configuration

Webhooks are configured in `server/config.json` via the `webhooks` array. Each element is validated at runtime against the [`WebhookSupport`](server/src/index.ts:1257) shape. Invalid entries are logged and skipped.

Example:

```json
{
  "webhooks": [
    {
      "url": "https://your-webhook-endpoint.com/chatlayer-events",
      "headers": {
        "Authorization": "Bearer your_api_token",
        "X-Source": "chatlayer"
      },
      "query": {
        "api_key": "your_api_key"
      },
      "retry": {
        "attempts": 3,
        "delay_ms": 3000
      }
    }
  ]
}
```

## Required Fields

- `url` (string)
  - Target endpoint for outgoing POST requests.

## Optional Fields

- `headers` (object<string,string>)
  - Custom headers added to each request.
  - The server always starts from:
    - `Content-Type: application/json`
  - Your configured headers are merged on top. If you set `Content-Type` yourself, it overrides the default.
  - Typical usage:
    - `Authorization: Bearer <token>`
    - `X-Signature`, `X-Source`, etc.

- `query` (object<string,string>)
  - Appended as URL query parameters to the `url`.
  - Applied using proper encoding. If `url` is not fully qualified, query is appended manually.
  - Example result:
    - Base: `https://example.com/hook`
    - Query: `{ "api_key": "abc", "env": "prod" }`
    - Final: `https://example.com/hook?api_key=abc&env=prod`

- `retry` (object)
  - Controls retry behavior per webhook:
    - `attempts` (number)
      - Total attempts including the first one.
      - Default: `3`
    - `delay_ms` (number)
      - Delay between attempts.
      - Default: `3000`
  - A retry is triggered on:
    - Network errors / thrown exceptions
    - Non-200/204 HTTP status codes

If `webhooks` is present but not an array, or an entry is malformed (e.g. missing `url`), it is logged and ignored, and webhook support continues for valid entries.

# Trigger Conditions

Webhooks are dispatched only for `manager_message` events.

- When a message is created via `/api/v1/addMessage` or `/api/v1/addMessageSingle`:
  - If `message.messageType === "manager_message"`:
    - Notify long-poll listeners with role `bot`
    - Invoke `sendToWebhooks({ success: true, messages: [msg] })`
  - Otherwise:
    - Only UI listeners are notified; no webhook call is made.

This means your webhook receives only manager-side control/command messages, not all chat traffic by default.

# Payload Structure

Each webhook POST uses:

- Method: `POST`
- Body: JSON
- Headers:
  - `Content-Type: application/json` (default)
  - plus any configured headers

Base shape:

```json
{
  "success": true,
  "messages": [
    {
      "id": 123,
      "botId": "your_bot_id",
      "roomId": "room_identifier",
      "userId": "user_identifier",
      "username": "optional_username",
      "name": "optional_name",
      "messageType": "manager_message",
      "text": "message content",
      "attachments": [
        {
          "id": "uuid",
          "type": "image|video|document|file",
          "isExternal": false,
          "filename": "file-name.ext",
          "url": "https://...signed-url-or-empty-string",
          "mime_type": "image/png",
          "size": 12345,
          "createdAt": "2023-01-01T00:00:00.000Z"
        }
      ],
      "meta": null,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

Implementation details:

- The structure mirrors what is returned from the message APIs after:
  - DB insert,
  - `populateSignedUrlsInMessages` for attachments.
- For internal attachments:
  - A signed URL may be present in `url` when available.
  - Internal-only helpers (like `_storedFilename`) are stripped before sending.

Your consumer should:

- Treat `messages` as an array (even if only one message is sent).
- Use `success` for a quick sanity check.
- Process based on `messageType`, `botId`, and other fields as needed.

# Headers and Authentication Expectations

The ChatLayer server does NOT validate your webhook endpoint’s response body content, only the HTTP status.

You are responsible for:

- Protecting your webhook endpoint (e.g., shared secret, token, IP allowlist).
- Configuring any required credentials via `headers` and/or `query`.

Common patterns:

- Bearer token header:
  - `Authorization: Bearer <your-secret>`
- Static signature / tenant key:
  - `X-ChatLayer-Webhook-Key: <secret>`
- Distinguishing environments:
  - `X-Env: production`

If you need request verification (HMAC, etc.), implement it on your side using headers or query params configured in `config.json`.

# Delivery Semantics and Confirmation

- A delivery attempt is considered successful when:
  - The webhook endpoint responds with:
    - HTTP 200 OK, or
    - HTTP 204 No Content
- On failure:
  - The server logs an error including:
    - Target URL
    - Attempt number
    - Status code (if any)
    - Response body (best-effort)
  - Retries are attempted according to `retry` configuration.
- After all retries fail:
  - No further attempts are made for that message/webhook pair.
  - Failures do NOT affect:
    - Message persistence
    - Responses to `/addMessage` or `/addMessageSingle`
    - Other webhooks

There is no built-in dead-letter queue; if you require one, implement it on your receiving side.

# Setup and Usage

1. Define your webhook(s) in `server/config.json` under `webhooks`.
2. Start the server:
   - `pnpm run dev`
3. Send a `manager_message`:

```bash
curl -X POST http://localhost:31000/api/v1/addMessage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "botId": "your_bot_id",
    "roomId": "your_room_id",
    "userId": "your_user_id",
    "messageType": "manager_message",
    "text": "Test webhook message"
  }'
```

4. Observe:
   - ChatLayer server logs for webhook POST attempts and retry logs.
   - Your endpoint’s logs to confirm receipt.

# Troubleshooting

- No webhook calls:
  - Check `config.json`:
    - `webhooks` is an array.
    - Each entry has a valid `url` (string).
  - Confirm that messages use `messageType: "manager_message"`.
- 4xx/5xx from your endpoint:
  - Inspect server logs; adjust your endpoint logic or configuration.
- Repeated failures:
  - Verify DNS/SSL/accessibility of your endpoint.
  - Ensure your auth headers/query params are correct.
- Mixed environments:
  - Use headers like `X-Env` or query params to distinguish dev/stage/prod.

# See Also

- [`ARCH.md`](web_ui/agent_docs/ARCH.md) for overall system architecture.
- [`ARCH_long-polling.md`](server/agent_docs/ARCH_long-polling.md) for long-polling behavior and relation to webhook triggers.