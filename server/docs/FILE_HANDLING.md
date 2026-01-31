# File Handling

## Overview

ChatLayer supports file uploads through two mechanisms: direct multipart uploads and URL-based uploads. All files are stored on disk with server-generated UUIDs and protected by signed URLs.

## File Upload Endpoints

### POST /api/v1/uploadFile

Upload one or more files via multipart/form-data.

**Request:**
- `file`: Binary file(s) (array)
- `type[]`: Optional array of types: `"image" | "video" | "document" | "file"`
- `filename[]`: Optional array of filenames for metadata

**Response:**
```json
{
  "success": true,
  "attachments": [
    {
      "id": "uuid-here",
      "type": "image",
      "isExternal": false,
      "filename": "original-name.jpg",
      "original_name": "original-name.jpg",
      "mime_type": "image/jpeg",
      "size": 12345,
      "createdAt": "2026-01-31T00:00:00.000Z",
      "url": ""
    }
  ]
}
```

**Key Points:**
- Server generates UUID for each file (not client-provided ID)
- Files stored as `<uuid><extension>` in `public/uploads/`
- MIME type detected from buffer using `file-type` library
- `url` is empty for internal attachments (populated when messages are fetched)

### POST /api/v1/uploadFileByURL

Upload files by fetching from remote URLs.

**Request:**
```json
{
  "files": [
    {
      "url": "https://example.com/file.jpg",
      "filename": "optional-name.jpg",
      "type": "image"
    }
  ]
}
```

**Response:** Same as `/uploadFile`

**Key Points:**
- Fetches remote file using `fetch` or `node-fetch` fallback
- Detects MIME type from buffer or Content-Type header
- Extracts filename from URL if not provided

### POST /api/v1/addMessageSingle

Convenience endpoint to upload a single file and create a message in one request.

**Request (multipart/form-data):**
- `file`: Binary file (single)
- `type`: Optional type hint
- `filename`: Optional filename hint
- `botId`, `roomId`, `userId`: Required message identifiers
- `username`, `name`: Optional user data
- `messageType`, `text`: Optional message fields
- `meta`: Optional JSON string or object

**Response:**
```json
{
  "success": true,
  "message": { /* full message object */ }
}
```

## File Storage

### Storage Location
- **Path:** `public/uploads/` (relative to project root)
- **Filename format:** `<uuid><extension>` (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`)
- **UUID generation:** Uses `crypto.randomUUID()` or fallback to timestamp + random string

### File Processing Flow

1. **Upload:** File received via multipart or URL fetch
2. **Detection:** MIME type and extension detected from buffer
3. **Storage:** File written to disk with UUID-based filename
4. **Metadata:** Attachment object created with:
   - `id`: UUID (no extension)
   - `type`: Category (image|video|document|file)
   - `isExternal`: Always `false` for uploads
   - `filename`: Sanitized original filename
   - `original_name`: Original filename from upload
   - `mime_type`: Detected MIME type
   - `size`: File size in bytes
   - `createdAt`: Upload timestamp
   - `_storedFilename`: Internal field with full filename (removed before sending to client)

### Type Detection

Files are categorized into four types:
- **image:** MIME type starts with `image/`
- **video:** MIME type starts with `video/`
- **document:** MIME contains `pdf`, `msword`, `officedocument`, or `text`
- **file:** Default fallback

Client can override type via `type` parameter.

## Signed URLs

### Purpose

Protect file access from unauthorized downloads. Files are only accessible via signed URLs with expiration timestamps.

### Environment Variable

```bash
FILE_SIGNING_SECRET=your-secret-here
```

**Critical:** If not set, file uploads will fail with a warning.

### URL Generation

```typescript
generateSignedUrl(storedFilename, expiresSec, filename?)
```

**Parameters:**
- `storedFilename`: Full filename with extension (e.g., `uuid.jpg`)
- `expiresSec`: TTL in seconds (default: 3600 = 1 hour)
- `filename`: Optional original filename for Content-Disposition header

**Returns:** `/uploads/uuid.jpg?exp=1234567890&sig=abc123...&filename=original.jpg`

### URL Verification

```typescript
verifySignature(filePath, expTs, sig)
```

**Process:**
1. Check if `FILE_SIGNING_SECRET` is configured
2. Verify signature using HMAC-SHA256
3. Check if timestamp is expired
4. Use `crypto.timingSafeEqual` to prevent timing attacks

### File Access Endpoint

**GET /uploads/:file**

Authentication via:
1. **Signed URL:** `?exp=<timestamp>&sig=<signature>`
2. **API Key:** `Authorization: Bearer <key>` or `x-api-key: <key>` or `?api_key=<key>`

**Response:** File binary with `Content-Disposition: attachment; filename*=UTF-8''<encoded-name>`

### Signed URL Population

When messages are fetched, internal attachments get signed URLs populated:

```typescript
populateSignedUrlsInMessages(messages)
```

**Process:**
1. Iterate through message attachments
2. Skip external attachments (`isExternal: true`)
3. Skip if URL already present
4. Generate signed URL using `_storedFilename` or reconstruct from `id` + extension
5. Remove `_storedFilename` before sending to client

## File Cleanup (Sweep Job)

### Purpose

Automatically remove old files from disk and database to prevent storage bloat.

### Configuration

**server.json:**
```json
{
  "fileTTLSeconds": 604800  // 7 days in seconds
}
```

### Sweep Process

**Runs:** Every hour (`setInterval(sweepOldFiles, 1000 * 60 * 60)`)

**Process:**
1. Query all messages with attachments
2. For each attachment:
   - Check if `createdAt` is older than TTL
   - If expired, delete file from disk
   - Remove attachment from message's attachments array
3. Update message with remaining attachments (or `null` if empty)

**File Deletion:**
- Uses `fs.unlink` to delete file
- Ignores `ENOENT` errors (file already deleted)
- Logs other errors for investigation

### Stored Filename Resolution

Sweep job determines disk filename in order:
1. `_storedFilename` field (if present)
2. Reconstruct from `id` + extension from `filename`
3. Fallback to `filename` field

## Configuration Options

### server.json

```json
{
  "maxFileSize": 10485760,      // 10 MB in bytes
  "fileTTLSeconds": 604800      // 7 days in seconds
}
```

### Environment Variables

```bash
FILE_SIGNING_SECRET=your-secret-key-here
```

## Security Considerations

1. **Filename Sanitization:**
   - Removes path separators (`/`, `\`)
   - Strips query strings
   - Removes URL-encoded artifacts (`=3D`, `=26`)
   - Decodes percent-encoding

2. **Signed URL Protection:**
   - HMAC-SHA256 signature
   - Expiration timestamp
   - Timing-safe comparison
   - API key fallback for admin access

3. **File Type Validation:**
   - MIME type detection from buffer (not just extension)
   - Server-side UUID generation (prevents path traversal)
   - Size limits enforced by Multer

## Error Handling

### Upload Errors

- **400:** No files uploaded
- **500:** Failed to store files (disk write error)
- **500:** Failed to fetch remote file (network error)
- **502:** Remote file fetch returned non-2xx status

### Access Errors

- **403:** Invalid or expired signature
- **403:** Signature required (no API key or signature)
- **404:** File not found

## Related Files

- **Implementation:** `src/index.ts` (lines 410-969)
- **Helpers:** `processUploadedFiles()`, `generateSignedUrl()`, `verifySignature()`, `populateSignedUrlsInMessages()`, `sweepOldFiles()`
- **Config:** `config/server.json`
- **Environment:** `FILE_SIGNING_SECRET`