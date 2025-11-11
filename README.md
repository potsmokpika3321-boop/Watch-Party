# 🎬 WatchParty

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/watchparty/watchparty/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.3.3-47848F)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org/)

**Watch videos together with synchronized playback and public sharing via ngrok.** Create watch parties where everyone sees the same video at the same time, perfect for remote movie nights, presentations, or group viewing experiences.

## ✨ Features

### 🎥 **Synchronized Video Playback**
- **Real-time sync**: Play, pause, and seek actions are instantly synchronized across all viewers
- **Host controls**: Only the host can control playback - viewers follow automatically
- **Low latency**: Optimized for smooth playback with minimal lag
- **Event throttling**: Prevents network spam while maintaining responsiveness

### 🌐 **Public Sharing**
- **ngrok integration**: Share your watch party with anyone worldwide using the ngrok agent SDK
- **One-click sharing**: Copy public URL and share instantly
- **Secure access**: Public URLs are temporary and require no additional setup
- **Token testing**: Built-in token validation before sharing

### 🖥️ **Desktop Application**
- **Native experience**: Full-featured Electron desktop app with modern UI
- **File picker**: Easy video file selection with format filtering
- **Settings persistence**: Remembers your ngrok token and video selections
- **System tray ready**: Runs as a standalone desktop application

### ⚡ **Performance Optimized**
- **Video streaming**: 1MB chunks with browser caching for smooth playback
- **Compression**: Gzip compression reduces bandwidth usage by ~70%
- **Rate limiting**: Protects server from overload (1000 req/15min, 100 video req/min)
- **Buffering optimization**: Smart buffering for remote viewers

### 🔧 **Developer Friendly**
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Web interface**: Access via any modern web browser
- **REST API**: Admin endpoints for video path management
- **Health monitoring**: Built-in health checks and status monitoring
- **Smoke testing**: Automated testing for deployment validation

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/watchparty/watchparty.git
cd watchparty

# Install dependencies
npm install

# Launch the desktop app
npm run app
```

### First Time Setup

1. **Launch WatchParty**: The app opens with a modern welcome screen
2. **Select Video**: Click "Select Video" to choose your MP4, WebM, MKV, or MOV file
3. **Configure Sharing** (optional):
   - Click "Config ngrok" to set up public sharing
   - Get a free token from [ngrok.com](https://ngrok.com)
   - Test your token before saving
4. **Start Server**: Click "Start Server" to begin hosting
5. **Share URL**: Once ngrok connects, copy the public URL and share with friends!

## 📖 Usage Guide

### 🏠 **As a Host**

1. **Select Video**: Use the file picker to choose your video file
2. **Configure ngrok** (optional): Set your authtoken for public sharing
3. **Start Server**: Click the green "Start Server" button
4. **Share URL**: Copy the generated public URL from the status area
5. **Control Playback**: Use the video controls in the web interface

### 👥 **As a Viewer**

1. **Open Shared URL**: Click the public link shared by the host
2. **Wait for Host**: The video will start when the host begins playback
3. **Enjoy**: Everything syncs automatically - just watch!

### 🎮 **Controls**

- **Host**: Use native HTML5 video controls (play/pause/seek)
- **Viewer**: Playback is fully synchronized - no controls needed
- **Volume**: Each person controls their own volume locally

## 🛠️ **Advanced Configuration**

### Environment Variables

```bash
# Video file path
VIDEO_PATH="/path/to/your/video.mp4"

# ngrok authentication (optional)
NGROK_AUTHTOKEN="your_ngrok_token"

# Server port (default: 3000)
PORT=3000
```

### API Endpoints

- `GET /health` - Health check
- `GET /video` - Video stream
- `GET /video-info` - Video metadata
- `GET /public-url` - Current public URL
- `POST /admin/video-path` - Update video path (accepts JSON: `{"path": "/path/to/video"}`)

### Supported Video Formats

- **MP4** (H.264/AAC) - Recommended for best compatibility
- **WebM** (VP8/VP9)
- **MKV** (various codecs)
- **MOV** (QuickTime)

## 🏗️ **Building from Source**

### Development Setup

```bash
# Install dependencies
npm install

# Start development server only
npm start

# Launch Electron app in development
npm run app

# Run smoke tests
npm run smoke
```

### Building Installers

#### Windows (electron-builder)
```bash
# Build Windows installer
npm run build:win

# Build for all platforms
npm run build
```

#### Windows (NSIS - Advanced)
```bash
# Install NSIS (one-time setup)
.\setup-nsis.bat

# Build installer from electron-builder output
.\build-nsis.bat

# Or build directly with makensis
"C:\Program Files (x86)\NSIS\makensis.exe" installer.nsh
```

### Build Configuration

The app uses electron-builder with the following features:
- **App ID**: `com.watchparty.app`
- **Product Name**: WatchParty
- **Target Platforms**: Windows (x64, ia32)
- **NSIS Installer**: Professional setup wizard with shortcuts
- **File Packaging**: Optimized with asar unpacking for server files

## 🔧 **Troubleshooting**

### Common Issues

**❌ "Video load failed"**
- Ensure video file exists and is accessible
- Check file permissions
- Try MP4 format for best compatibility
- Verify the file isn't corrupted

**❌ "429 Too Many Requests"**
- Rate limiting is protecting the server
- Wait a moment and refresh
- Contact host if issue persists

**❌ "Autoplay blocked"**
- Modern browsers block autoplay without user interaction
- Click anywhere on the page to enable audio
- The host needs to start playback manually

**❌ ngrok connection issues**
- Verify your authtoken is correct and active
- Check ngrok account status and credits
- Try restarting the server
- Test token in the settings modal before saving

**❌ "Server failed to start"**
- Check if port 3000 is already in use
- Try a different port using the PORT environment variable
- Check server logs for detailed error messages

### Logs and Debugging

- **Server logs**: View in the client interface under "Server Logs"
- **Electron logs**: Check console output when running `npm run app`
- **Smoke test**: Run `npm run smoke` to validate server functionality
- **Settings**: Configuration stored in `%APPDATA%\WatchParty\settings.json`

### Network Requirements

- **Host**: Needs internet connection for ngrok (optional for local-only)
- **Viewers**: Need internet connection to access public URLs
- **Ports**: Server runs on port 3000 by default
- **WebSocket**: Uses Socket.IO for real-time synchronization

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper testing
4. Run smoke tests: `npm run smoke`
5. Test the full app: `npm run app`
6. Submit a pull request

### Code Style

- Use modern JavaScript (ES6+)
- Follow ESLint configuration
- Add JSDoc comments for new functions
- Test all changes with the smoke test suite
- Update documentation for new features

## 📋 **Project Structure**

```
watchparty/
├── electron/           # Electron main process files
│   ├── main.js        # Main Electron process
│   ├── preload.js     # Preload script for security
│   ├── welcome.html   # Setup/configuration UI
│   └── settings.html  # Settings modal (legacy)
├── server/            # Express.js server
│   ├── index.js       # Main server file
│   ├── ngrok.js       # ngrok integration
│   ├── sync.js        # Socket.IO synchronization
│   └── videoStream.js # Video streaming logic
├── client/            # Web client
│   ├── index.html     # Video player interface
│   ├── script.js      # Client-side logic
│   └── style.css      # Modern CSS styling
├── scripts/           # Development scripts
│   └── smoke-test.js  # Automated testing
├── build/             # Build resources
└── dist/              # Build output
```

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 **Credits**

- **Electron** - Desktop app framework
- **Socket.IO** - Real-time communication
- **ngrok** - Public tunneling service
- **Express.js** - Web server framework
- **NSIS** - Windows installer
- **Inter Font** - Modern typography

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/watchparty/watchparty/issues)
- **Discussions**: [GitHub Discussions](https://github.com/watchparty/watchparty/discussions)
- **Documentation**: Check the server logs in-app for debugging

---

**Made with ❤️ for movie nights and presentations worldwide**

*WatchParty v1.1.0 - Modern synchronized video streaming for everyone*
