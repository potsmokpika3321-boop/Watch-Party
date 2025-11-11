🧩 Core Objectives

✅ Stream a local video file via HTTP with proper range support.

✅ Sync video playback across all viewers in real time using Socket.IO.

✅ Expose a public, shareable link using ngrok.

✅ Provide a simple, responsive web-based video player interface.

⚙️ Optional: Add chat and reactions for engagement.

🏗️ Project Structure
watch-party/
│
├── server/
│   ├── index.js             # Main Express + Socket.IO + ngrok entry
│   ├── videoStream.js       # Handles HTTP range video streaming
│   ├── sync.js              # Socket.IO event handlers for playback sync
│   ├── ngrok.js             # ngrok tunnel initialization and management
│   └── config.js            # Configuration (port, ngrok token, etc.)
│
├── client/
│   ├── index.html           # UI for video player
│   ├── script.js            # Frontend logic: socket + video sync
│   └── style.css            # Basic styling for the player and chat
│
├── package.json
├── README.md
└── PLAN.md

⚙️ Dependencies
Package	Purpose
express	Serves static files and handles video routes
socket.io	Real-time synchronization between clients
ngrok	Exposes local server to the internet
mime	Handles correct content type for video streaming
🚀 Features Breakdown
1. Video Streaming

Serve video from local filesystem with byte-range support.

Endpoint: /video

Automatically detect MIME type.

2. Real-Time Synchronization

Use Socket.IO to broadcast playback actions:

play

pause

seek

Each client updates its <video> element accordingly.

3. Public Access (ngrok)

On server start, ngrok automatically creates a tunnel.

Logs the public URL to share with friends.

Handles reconnection if the tunnel drops.

4. Frontend UI

HTML5 video player connected to /video.

Socket connection initialized on page load.

Event listeners for play/pause/seek.

Responsive layout with optional chat window.

💬 Optional Features (Future Enhancements)
Feature	Description
Chat	Real-time text chat using Socket.IO
Reactions	Emojis or “applause” signals
Authentication	Host password or temporary room links
File browser	Allow multiple video uploads and selection
Transcoding	Auto-convert non-MP4 formats via FFmpeg
🧠 Implementation Steps
Phase 1 — Backend Setup

Initialize Node.js project (npm init -y)

Install dependencies:

npm install express socket.io ngrok mime


Implement video streaming logic in videoStream.js.

Set up Express server in index.js.

Phase 2 — Socket.IO Integration

Add real-time communication layer.

Define event listeners for sync actions.

Test locally with multiple tabs.

Phase 3 — ngrok Integration

Use ngrok SDK to open a tunnel to your local server.

Print the public URL on server startup.

Phase 4 — Frontend UI

Build a clean, minimal HTML5 video player.

Integrate Socket.IO client to sync playback.

Add event listeners and handlers for all sync actions.

Phase 5 — Testing and Polish

Test with multiple users via ngrok link.

Add error handling (e.g., missing file, tunnel closed).

Optional: Add chat panel and reactions.

🧪 Testing Strategy
Test Area	Method
Video Stream	Load video locally, check range requests via DevTools
Socket Sync	Open multiple browsers and test simultaneous actions
ngrok Tunnel	Verify link accessibility from external network
Latency	Measure playback delay and fine-tune sync threshold
⚖️ Licensing & Credits

This project is open source under the MIT License.
Developed with ❤️ using Node.js, Socket.IO, and ngrok.

✅ Next Step

Run the initial backend setup:

npm init -y
npm install express socket.io ngrok mime


Then, implement server/index.js and client/index.html as the base for the MVP.