# 🎬 WatchParty

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/watchparty/watchparty/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.3.3-47848F)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org/)

**Watch videos together with synchronized playback and public sharing.** Create watch parties where everyone sees the same video at the same time, perfect for remote movie nights, presentations, or group viewing experiences.

![WatchParty Demo](https://via.placeholder.com/800x400/6366f1/ffffff?text=WatchParty+Screenshot)

## ✨ Features

### 🎥 **Synchronized Video Playback**
- **Real-time sync**: Play, pause, and seek actions are instantly synchronized across all viewers
- **Host controls**: Only the host can control playback - viewers follow automatically
- **Low latency**: Optimized for smooth playback with minimal lag
- **Event throttling**: Prevents network spam while maintaining responsiveness

### 🌐 **Public Sharing**
- **ngrok integration**: Share your watch party with anyone worldwide
- **One-click sharing**: Copy public URL and share instantly
- **Secure access**: Public URLs are temporary and require no additional setup

### 🖥️ **Desktop Application**
- **Native experience**: Full-featured Electron desktop app
- **File picker**: Easy video file selection with format filtering
- **System tray**: Runs in background with system notifications
- **Settings persistence**: Remembers your ngrok token and preferences

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

## 🚀 Quick Start

### Option 1: Windows Installer (Recommended)

1. **Download** the latest `WatchParty-Setup.exe` from [Releases](https://github.com/watchparty/watchparty/releases)
2. **Install** the application
3. **Launch** WatchParty from your desktop or start menu
4. **Select** a video file and configure ngrok (optional)
5. **Start** the server and share the public URL!

### Option 2: From Source

#### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

#### Installation

```bash
# Clone the repository
git clone https://github.com/watchparty/watchparty.git
cd watchparty

# Install dependencies
npm install

# Launch the desktop app
npm run app
```

## 📖 Usage Guide

### 🏠 **As a Host**

1. **Launch** WatchParty
2. **Select Video**: File → Open Video… (choose your MP4, WebM, MKV, or MOV file)
3. **Configure Sharing** (optional):
   - Public → Set ngrok authtoken… (get free token from [ngrok.com](https://ngrok.com))
4. **Start Server**: Server → Start Server
5. **Share URL**: Once ngrok connects, copy the public URL and share with friends!

### 👥 **As a Viewer**

1. **Open** the shared URL in your web browser
2. **Wait** for the host to start the video
3. **Enjoy** synchronized playback!

### 🎮 **Controls**

- **Host**: Use native video controls (play/pause/seek)
- **Viewer**: Everything syncs automatically - just watch!
- **Volume**: Each person controls their own volume locally

## 🛠️ **Advanced Configuration**

### Environment Variables

```bash
# Video file path
VIDEO_PATH="/path/to/your/video.mp4"

# ngrok authentication (optional)
NGROK_AUTHTOKEN="your_ngrok_token"

# Disable ngrok even with token
ENABLE_NGROK="false"
```

### API Endpoints

- `GET /health` - Health check
- `GET /video` - Video stream
- `GET /video-info` - Video metadata
- `GET /public-url` - Current public URL
- `POST /admin/video-path` - Update video path

### Supported Formats

- **MP4** (H.264/AAC) - Recommended
- **WebM** (VP8/VP9)
- **MKV** (various codecs)
- **MOV** (QuickTime)

## 🏗️ **Building from Source**

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Launch Electron app
npm run app
```

### Building Installers

```bash
# Install build tools
npm install -g electron-builder

# Build for current platform
npm run build

# Build Windows installer (electron-builder)
npm run build:win

# Alternative: Build NSIS installer manually (Windows)
# Requires NSIS to be installed
.\setup-nsis.bat    # Install NSIS if needed
.\build-nsis.bat    # Build installer manually

# Build everything
npm run dist
```

### NSIS Installer

For manual Windows installer creation with full customization:

```bash
# Install NSIS (one-time setup)
.\setup-nsis.bat

# Build installer from electron-builder output
.\build-nsis.bat

# Or build directly with makensis
"C:\Program Files (x86)\NSIS\makensis.exe" installer.nsh
```

The NSIS installer provides:
- Professional setup wizard
- Desktop and Start Menu shortcuts
- Proper uninstaller
- Registry integration
- File association options

## 🔧 **Troubleshooting**

### Common Issues

**❌ "Video load failed"**
- Ensure video file exists and is accessible
- Check file permissions
- Try MP4 format for best compatibility

**❌ "429 Too Many Requests"**
- Rate limiting is protecting the server
- Wait a moment and refresh
- Contact host if issue persists

**❌ "Autoplay blocked"**
- Click anywhere on the page to enable audio
- Modern browsers block autoplay without user interaction

**❌ ngrok connection issues**
- Verify your authtoken is correct
- Check ngrok account status
- Try restarting the server

### Logs and Debugging

- **Server logs**: Check console output when starting server
- **Browser console**: F12 → Console for client-side errors
- **Settings**: Stored in `%APPDATA%\WatchParty\settings.json`

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- Use ESLint configuration
- Follow conventional commit messages
- Add tests for new features
- Update documentation

## 📋 **Roadmap**

- [ ] **Mobile app** (React Native)
- [ ] **Chat integration** during watch parties
- [ ] **Playlist support** for multiple videos
- [ ] **Screen sharing** for presentations
- [ ] **Recording** watch party sessions
- [ ] **Cloud storage** integration

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 **Credits**

- **Electron** - Desktop app framework
- **Socket.IO** - Real-time communication
- **ngrok** - Public tunneling
- **Express.js** - Web server framework
- **NSIS** - Windows installer

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/watchparty/watchparty/issues)
- **Discussions**: [GitHub Discussions](https://github.com/watchparty/watchparty/discussions)
- **Email**: support@watchparty.app

---

**Made with ❤️ for movie nights and presentations worldwide**

[![Star History Chart](https://api.star-history.com/svg?repos=watchparty/watchparty&type=Date)](https://star-history.com/#watchparty/watchparty&Date)
