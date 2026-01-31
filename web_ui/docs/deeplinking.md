# Deeplinking Feature Documentation

## Overview

The web_ui now supports deeplinking to specific chats using hash-based routing. This allows users to share direct links to conversations and bookmark specific chats for quick access.

## URL Format

Deeplinks use the following format:
```
https://your-domain.com/#{bot_id}/{username}/
```

- `bot_id` (required): The ID of the bot to navigate to
- `user_id` (optional): The user ID or room ID to open

Note: The system handles potential double hash issues (e.g., `/#/home#/bot/username`) by extracting the correct hash portion.

### Examples

- Navigate to a specific bot: `/#/bot123/`
- Navigate to a specific chat: `/#/bot123/john_doe/`
- Navigate using room ID: `/#/bot123/room-456/`

## Features

### 1. Automatic Navigation
When a user opens a deeplink, the application will:
1. Check authentication status
2. Load the specified bot
3. If username provided, find and open the corresponding chat
4. Show loading indicators during navigation
5. Display success/error messages

### 2. URL Synchronization
The URL automatically updates when users:
- Select different bots
- Navigate between chats
- This creates shareable links for any currently viewed conversation

### 3. Error Handling
The app gracefully handles:
- Invalid bot IDs
- Non-existent usernames/rooms
- Missing authentication
- Network errors

### 4. Authentication Flow
If a user opens a deeplink while not authenticated:
1. The app redirects to home page
2. Authentication modal is displayed
3. After successful authentication, the original deeplink is processed

## Implementation Details

### Router Configuration
- Uses Vue Router with hash history (`createWebHashHistory`)
- Dynamic routes:
  - `/:botId/:userId?` for direct bot access
  - `/home/:botId/:userId?` for home-based navigation
- Route guard checks authentication before processing deeplinks

### Key Components

#### Hash Parser Utility (`src/utils/hashParser.ts`)
- `parseHash()`: Extracts bot_id and username from URL
- `buildHash()`: Creates hash URL from parameters
- `isValidDeeplinkHash()`: Validates URL format

#### HomePage Component Updates
- Watches route parameters for deeplink navigation
- Handles bot and room selection based on URL
- Updates URL when users navigate manually
- Shows loading states and error messages

#### Route Guards
- Checks authentication before allowing deeplink navigation
- Stores intended route for post-authentication navigation

## Usage Examples

### Sharing a Chat Link
Users can share links by:
1. Copying the URL from their browser
2. The URL will always reflect the current bot and chat

### Bookmarking
Users can bookmark specific chats:
1. Navigate to the desired conversation
2. Bookmark the page in their browser
3. The bookmark will open directly to that chat

### Programmatic Navigation
Developers can navigate programmatically:
```javascript
import { useRouter } from 'vue-router';

const router = useRouter();
router.push('#/home/bot123/username/');
```

## Testing Scenarios

1. **Valid Bot Only**: `/#/home/existing-bot/`
   - Should load the bot and show its room list

2. **Valid Bot and UserId**: `/#/home/existing-bot/user-123/`
    - Should load the bot and open the specific chat

3. **Invalid Bot**: `/#/home/non-existent-bot/`
   - Should show error message

4. **Invalid UserId**: `/#/home/existing-bot/user-456/`
    - Should load the bot but show error for the chat

5. **Unauthenticated Access**: Any deeplink without auth
   - Should show auth modal, then proceed after login

6. **Home Route with Bot**: `/#/home/bot/userId`
    - Should correctly navigate to bot/userId

## Browser Support

- Works in all modern browsers
- Uses hash routing for maximum compatibility
- No server-side configuration required

## Future Enhancements

Potential improvements:
1. Support for message-specific deeplinks
2. Navigation history tracking
3. QR code generation for sharing
4. Deep linking from mobile apps