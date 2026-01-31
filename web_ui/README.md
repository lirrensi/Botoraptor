# ChatLayer Web UI

This is a minimal Ionic + Vue frontend for ChatLayer. It provides:
- API key authentication (stored in localStorage as `chatlayer_api_key`)
- Two-column responsive layout (desktop) and mobile-adaptive views
- Chat list (left) and chat view (right)
- Message sending via POST /addMessage
- Message loading via GET /getMessages

Quick start

1. Install dependencies (from the project root):
   cd web_ui
   pnpm install

2. Start dev server:
   cd web_ui
   pnpm dev

Configuration

- API base URL
  - The UI uses `http://localhost:3000` by default.
  - To override, create an `.env` file in `web_ui/` with:
    VITE_API_BASE=http://your-server:3000

- API key (authentication)
  - On first load the app will prompt for `API key`.
  - The key is validated by calling `GET /getMessages?botId=test-bot&limit=1`.
  - If accepted, the key is stored in localStorage under `chatlayer_api_key` and will be sent as `x-api-key` header for all requests.

Files of interest

- [`web_ui/src/services/api.ts`](web_ui/src/services/api.ts:1) — axios wrapper; reads/stores API key and exposes `getMessages`, `addMessage`, `getUpdates`.
- [`web_ui/src/components/AuthModal.vue`](web_ui/src/components/AuthModal.vue:1) — API key prompt/validation.
- [`web_ui/src/components/ChatList.vue`](web_ui/src/components/ChatList.vue:1) — chat list UI.
- [`web_ui/src/components/ChatView.vue`](web_ui/src/components/ChatView.vue:1) — chat messages, filters and composer.
- [`web_ui/src/views/HomePage.vue`](web_ui/src/views/HomePage.vue:1) — layout and wiring.

## Search functionality

Client-side search is implemented and persisted locally. It requires no server calls.

- Store state
  - The UI store holds `ui.search.query` and derived flags/tokens (`isSearchActive`, `searchTokens`). See [web_ui/src/stores/uiStore.ts](web_ui/src/stores/uiStore.ts) for implementation and persistence in the cache.
- Chat list (left column)
  - A compact search bar appears above the list. See [web_ui/src/components/ChatList.vue](web_ui/src/components/ChatList.vue):
    - Search icon on the left, clear action on the right.
    - Input debounced (~150ms) and case-insensitive matching against username and last message text, with roomId fallback when username is missing.
    - Esc clears the query.
    - Strings from i18n: `search.placeholder` and `search.clear` in [web_ui/src/locales/en.json](web_ui/src/locales/en.json) and [web_ui/src/locales/ru.json](web_ui/src/locales/ru.json).
- Chat view (right column)
  - Messages are not filtered. Instead, occurrences of the typed tokens are highlighted in currently loaded messages using vue-highlight-words. See [web_ui/src/components/ChatView.vue](web_ui/src/components/ChatView.vue).
  - Highlight styling uses a `.hl` class with a subtle background for readability.
- Dependencies
  - The project already includes Fuse.js and vue-highlight-words. See [web_ui/package.json](web_ui/package.json) for versions.
- Behavior
  - The search query persists via the store’s cache. Clearing the query restores the full list and removes highlights.

Notes and next steps

- Attachments are currently omitted.
- Live updates: currently uses manual refresh; can be upgraded to longpoll (`/getUpdates`) or WebSocket later.
- Time formatting uses `timeago.js`.

Filename length safeguard

- IMPORTANT: Filenames longer than 128 characters can break the UI (layout overflow). Enforce a maximum filename length of 128 characters.
  - Server-side: sanitize and return a cleaned filename in the attachment metadata (e.g. `attachment.filename`). If an incoming filename is >128 chars, truncate while preserving the file extension (for example `very-long-name... .pdf`) or generate a short stable name (UUID + original ext).
  - Client-side: display a truncated filename and keep the full value only in the link title/tooltip. The UI uses [`web_ui/src/components/ChatView.vue`](web_ui/src/components/ChatView.vue:103) — see `getAttachmentFileName` usage for display and `:title` usage for the full value.
  - Uploads: when sending file metadata in FormData (`filename`), send the sanitized/trimmed filename to avoid the server echoing extremely long names/URLs back into the UI.

Rationale: long filenames (or signed URLs containing long query strings) may overflow message bubbles and push layouts beyond expected widths. Enforcing/sanitizing names prevents UI derailment and keeps message layout stable.