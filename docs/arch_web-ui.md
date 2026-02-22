# Web UI Architecture

Manager-facing web interface for ChatLayer — Vue 3 + Ionic.

---

## Overview

The Web UI is a single-page application (SPA) that allows managers to view conversations, send messages, and manage users. It's served as static files by the ChatLayer server.

**Scope Boundary:**

- **This component owns**: UI rendering, state management, user interactions, real-time updates via long-polling
- **This component does NOT own**: Data persistence, authentication (delegated to server), message delivery to end users
- **Boundary interfaces**: Communicates with server via REST API and long-polling

---

## Project Structure

```
web_ui/
├── src/
│   ├── main.ts               # Application bootstrap
│   ├── App.vue               # Root component
│   ├── components/
│   │   ├── AuthModal.vue     # API key authentication
│   │   ├── ChatList.vue      # Conversation list
│   │   ├── ChatView.vue      # Message view and composer
│   │   ├── LanguagePicker.vue
│   │   └── SettingsModal.vue
│   ├── views/
│   │   └── HomePage.vue      # Main layout
│   ├── stores/
│   │   └── uiStore.ts        # Pinia state management
│   ├── services/
│   │   └── api.ts            # HTTP client
│   ├── helpers/
│   │   └── notificationManager.ts
│   ├── router/
│   │   └── index.ts          # Vue Router configuration
│   ├── locales/
│   │   ├── en.json           # English translations
│   │   └── ru.json           # Russian translations
│   └── theme/
│       └── variables.css     # CSS variables
├── public/
├── tests/
└── package.json
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js | 3.5.22 | UI framework |
| Ionic | 8.7.8 | Mobile-first UI components |
| Pinia | 3.0.3 | State management |
| Vue Router | 4.6.3 | Routing |
| Axios | 1.13.1 | HTTP client |
| Vue i18n | 11.1.12 | Internationalization |
| Luxon | 3.7.2 | Date/time handling |
| Vite | 7.1.12 | Build tool |

---

## Core Components

### HomePage.vue

Main layout with two-column design:
- Left: Chat list (conversation selector)
- Right: Chat view (messages and composer)

**Responsibilities:**
- Route handling for deeplinks
- Bot and room selection
- Layout coordination

### ChatList.vue

Displays list of conversations with search and pagination.

**Features:**
- Search by username or last message text
- Shows last message preview
- Unread indicator
- Responsive design (collapses on mobile)
- Infinite scroll pagination (loads more rooms on scroll)

### ChatView.vue

Message display and composition.

**Features:**
- Message history with pagination
- Message type filtering
- File attachment support
- Quick replies
- Message composer

### AuthModal.vue

API key authentication modal.

**Flow:**
1. User enters API key
2. Key validated via test API call
3. Key stored in localStorage
4. Modal dismissed on success

---

## State Management

### uiStore.ts

Central Pinia store for application state.

**State Shape:**

```typescript
interface UIState {
  // Authentication
  apiKey: string | null;
  
  // Current selection
  currentBotId: string | null;
  currentRoomId: string | null;
  
  // Data
  bots: string[];
  rooms: RoomInfo[];
  messages: Message[];
  users: User[];
  
  // UI state
  isLoading: boolean;
  searchQuery: string;
  
  // Real-time
  isPolling: boolean;
}
```

**Key Actions:**

| Action | Description |
|--------|-------------|
| `setApiKey(key)` | Store API key in localStorage |
| `loadBots()` | Fetch bot list from server |
| `loadRooms(botId)` | Fetch rooms for a bot |
| `loadMessages(roomId)` | Fetch messages for a room |
| `sendMessage(text, attachments)` | Send a message |
| `startPolling()` | Begin long-polling for updates |
| `stopPolling()` | Stop long-polling |

**Persistence:**
- API key stored in localStorage
- Other state persisted to localforage for offline support

---

## Routing

### Route Configuration

```typescript
const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: HomePage },
  { path: '/:botId/:userId?', component: HomePage },
  { path: '/home/:botId/:userId?', component: HomePage },
];
```

Uses hash history (`createWebHashHistory`) for maximum compatibility.

### Deeplinking

URL format: `/#/home/{botId}/{userId}/`

**Behavior:**
1. Parse botId and userId from URL
2. Check authentication
3. Load specified bot
4. If userId provided, find and open corresponding room
5. Update URL when user navigates manually

See [deeplinking documentation](#deeplinking) for details.

---

## API Integration

### api.ts

Axios wrapper with authentication.

**Configuration:**
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:31000',
  timeout: 30000,
});
```

**Authentication:**
- API key read from localStorage (`chatlayer_api_key`)
- Added as `x-api-key` header to all requests

**Methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getMessages(params)` | GET /api/v1/getMessages | Fetch messages |
| `addMessage(data)` | POST /api/v1/addMessage | Send message |
| `getUpdates(params)` | GET /api/v1/getUpdates | Long-polling |
| `getBots()` | GET /api/v1/getBots | List bots |
| `getRooms(botId)` | GET /api/v1/getRooms | List rooms |
| `uploadFile(file)` | POST /api/v1/uploadFile | Upload file |

---

## Real-time Updates

### Long-Polling Implementation

```typescript
async function startPolling() {
  while (isPolling) {
    try {
      const messages = await api.getUpdates({
        botIds: currentBotId,
        listenerType: 'ui',
        timeout: 30000,
      });
      
      // Update store with new messages
      uiStore.addMessages(messages);
    } catch (error) {
      // Exponential backoff on error
      await sleep(backoff);
      backoff = Math.min(backoff * 1.5, 30000);
    }
  }
}
```

**Behavior:**
- Polls `/api/v1/getUpdates` with `listenerType: 'ui'`
- Receives all message types
- Reconnects automatically on error
- Stops when component unmounts

---

## Deeplinking

### URL Format

```
https://your-domain.com/#/{botId}/{userId}/
```

- `botId` (required): Bot to navigate to
- `userId` (optional): User/room to open

### Features

1. **Automatic Navigation**: Opens specified bot and room on load
2. **URL Synchronization**: URL updates as user navigates
3. **Shareable Links**: Users can copy URL to share conversations
4. **Bookmarking**: Users can bookmark specific chats

### Error Handling

- Invalid bot ID → Shows error message
- Invalid user ID → Loads bot, shows error for room
- Not authenticated → Shows auth modal, then processes deeplink

---

## Internationalization

### Supported Languages

- English (`en.json`)
- Russian (`ru.json`)

### Usage

```vue
<template>
  <p>{{ $t('search.placeholder') }}</p>
</template>
```

### Adding a Language

1. Create `src/locales/{lang}.json`
2. Import in `main.ts`
3. Add to `i18n` configuration

---

## Styling

### CSS Variables

Defined in `src/theme/variables.css`:

```css
:root {
  --ion-color-primary: #3880ff;
  --ion-color-secondary: #3dc2ff;
  /* ... */
}
```

### Responsive Design

- Two-column layout on desktop (>768px)
- Single column on mobile
- Ionic components adapt to platform

---

## Build Process

### Development

```bash
cd web_ui
pnpm install
pnpm run dev    # Starts Vite dev server on port 5173
```

### Production

```bash
pnpm run build  # Builds to dist/
                # Copies to server/public/
```

**Important:** The build script automatically copies output to `server/public/` so the server can serve it.

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE` | No | API base URL (default: `http://localhost:31000`) |

Create `.env` file in `web_ui/`:

```
VITE_API_BASE=https://api.your-domain.com
```

---

## Security Considerations

### API Key Storage

- Stored in localStorage (`chatlayer_api_key`)
- Cleared on 401/403 responses
- AuthModal shown when key missing/invalid

### File Uploads

- Filename length limited to 128 characters
- Files uploaded via signed URLs

### Dangerous File Warning

Messages containing attachments with potentially dangerous file extensions are flagged in the UI:

**Configuration:**
- Extension list defined in `client.json` under `dangerousExtensions`
- Default: `.exe`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.js`, `.vbs`, `.jar`, `.msi`, `.scr`, `.pif`, `.com`, `.lnk`

**Behavior:**
- Messages with matching extensions display a warning indicator
- Visual badge shown next to attachment
- Does not prevent download — managers can still access files
- Warning is informational only for non-technical users

### Trusted Network

The Web UI is designed for trusted networks:
- No built-in user authentication
- API key provides access to all data
- Consider additional auth layer for production

---

## Contracts / Invariants

| Invariant | Description |
|-----------|-------------|
| API key required | UI MUST NOT function without valid API key |
| URL sync | URL MUST reflect current bot and room selection |
| Graceful degradation | UI MUST handle API errors gracefully |
| Offline support | UI SHOULD persist state for offline access |

---

## Design Decisions

| Decision | Why | Confidence |
|----------|-----|------------|
| Ionic framework | Mobile-first, cross-platform, good DX | High |
| Hash routing | Works without server config, maximum compatibility | High |
| Long-polling over WebSockets | Simpler, matches server implementation | High |
| localStorage for API key | Simple, no session management needed | Medium — consider more secure storage |

---

## Implementation Pointers

- **Entry point**: `src/main.ts`
- **Main layout**: `src/views/HomePage.vue`
- **State**: `src/stores/uiStore.ts`
- **API client**: `src/services/api.ts`
- **Router**: `src/router/index.ts`
