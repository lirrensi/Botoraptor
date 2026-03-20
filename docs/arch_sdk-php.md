# PHP SDK

The PHP SDK is a single-file drop-in client for Botoraptor. It uses cURL and standard PHP arrays.

## Usage

```php
require_once __DIR__ . '/../chatLayerSDK_php/Botoraptor.php';

$client = new Botoraptor([
    'apiKey' => 'your-api-key',
    'baseUrl' => 'http://localhost:31000',
    'botId' => 'my-bot',
]);

$message = $client->addMessage([
    'botId' => 'my-bot',
    'roomId' => 'room-123',
    'userId' => 'user-456',
    'text' => 'Hello!',
]);
```

## Core Methods

| Method | Description |
|--------|-------------|
| `addMessage` | Send a message |
| `addManagerMessage` | Send a manager message |
| `sendServiceAlert` | Send a service call message |
| `addMessageSingle` | Send a message with one or more files |
| `addUser` | Create or return a user |
| `getMessages` | Fetch messages |
| `getBots` | List bot IDs |
| `getRooms` | Fetch room summaries |
| `uploadFile` | Upload raw file bytes |
| `uploadFileByURL` | Upload files from remote URLs |
| `onMessage` | Register a message listener |
| `start` / `stop` | Run the long-poll loop |

## Notes

- The PHP client defaults to `http://localhost:31000` when `baseUrl` is omitted.
- The SDK is self-contained and does not require Composer.
