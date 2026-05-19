# PRD: Module 5 - SSE Connection Manager

## Problem Statement
Standard HTTP APIs use a single Request-Response cycle. When checking 50+ sites, the client must wait 30+ seconds with a blank loader before receiving data, giving a poor user experience and no visual feedback.

## Solution
Leverage Server-Sent Events (SSE) via a specialized Express middleware route (`/api/scan`). This keeps a persistent connection open, letting the backend stream results immediately to the user interface as each social platform scan completes.

## User Stories

1. As a frontend dashboard, I want to establish a persistent text/event-stream connection, so that I can receive results in real-time.
2. As a user, I want to watch individual platform cards turn Green (Found) or Grey (Not Found) one-by-one, so that I can see live progress of the intelligence gathering.
3. As a developer, I want custom SSE chunk event signatures (`progress`, `result`, `error`, `end`), so that I can parse different stream packets cleanly in React.

## Implementation Decisions

### Route Signature
*   **Path**: `GET /api/scan`
*   **Query Params**: `?target=john_doe&categories=Tech,Social&hibp_key=optional_key`

### SSE Protocol Configuration
Headers sent to client to establish persistent downstream stream:
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no (important to bypass Nginx proxy buffering)
```

### Event Structuring
Every write to the SSE connection stream must follow the standard SSE structure:
`event: [EVENT_TYPE]\ndata: [STRINGIFIED_JSON]\n\n`

#### Event Contract Definitions:
*   **`event: progress`**:
    ```json
    { "completed": 5, "total": 40, "percentage": 12.5 }
    ```
*   **`event: result`**:
    ```json
    { "platform": "GitHub", "status": "FOUND", "url": "https://github.com/john_doe", "bio": "...", "avatar": "..." }
    ```
*   **`event: end`**:
    ```json
    { "summary": { "foundCount": 6, "timeTakenMs": 14200 } }
    ```

## Testing Decisions
*   **Buffer Flushes**: Verify the Express response object correctly flushes data after each write.
*   **Stream Closure Handling**: Implement clean backend logic listening to `req.on('close')`. If the client closes the browser or aborts, the server must stop the OSINT chunk loops to prevent wasting API and CPU cycles.

## Out of Scope
*   **Bi-directional streaming**: WebSockets (not needed as client only needs to read stream).
*   **SSE Authentication**: Restricting SSE routes with session cookies (routes stay public).

## Further Notes
*   This is a real-time Express router controller requiring non-blocking loop handling.
