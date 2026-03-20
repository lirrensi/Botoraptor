# Go SDK

The Go SDK is a thin HTTP client for Botoraptor. It mirrors the same REST surface as the Node SDK, but uses plain Go types and `net/http`.

## Package

Import the module from:

```go
import "github.com/lirrensi/Botoraptor/chatLayerSDK_go"
```

The package name is `botoraptor`.

## Quick Start

```go
import (
    "context"
    "log"

    botoraptor "github.com/lirrensi/Botoraptor/chatLayerSDK_go"
)

client, err := botoraptor.New(botoraptor.Config{
    APIKey:  "your-api-key",
    BaseURL: "http://localhost:31000",
    BotID:   "my-bot",
})
if err != nil {
    log.Fatal(err)
}

msg, err := client.AddMessage(context.Background(), botoraptor.AddMessageInput{
    BotID:  "my-bot",
    RoomID: "room-123",
    UserID: "user-456",
    Text:   "Hello!",
})
```

## Core Methods

| Method | Description |
|--------|-------------|
| `AddMessage` | Send a message |
| `AddManagerMessage` | Send a manager message |
| `SendServiceAlert` | Send a service call message |
| `AddMessageSingle` | Send a message with one or more files |
| `AddUser` | Create or return a user |
| `GetMessages` | Fetch messages |
| `GetBots` | List bot IDs |
| `GetRooms` | Fetch room summaries |
| `UploadFile` | Upload raw file bytes |
| `UploadFileByURL` | Upload files from remote URLs |
| `OnMessage` | Register a message listener |
| `Start` / `Stop` | Run the long-poll loop |

## Notes

- Go is server-side, so the client defaults to `http://localhost:31000` when `BaseURL` is omitted.
- `go.mod` lives in [`../chatLayerSDK_go/go.mod`](../chatLayerSDK_go/go.mod).
