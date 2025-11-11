const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const { streamVideo, getVideoInfo } = require('./videoStream');
const initSync = require('./sync');
const { startNgrok } = require('./ngrok');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Optimize socket.io for better remote performance
  pingTimeout: 120000, // 2 minutes
  pingInterval: 50000, // 50 seconds
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Reduce memory usage for better performance
  maxHttpBufferSize: 1e6, // 1MB
  connectTimeout: 45000,
});

// Rate limiting to prevent server overload
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => req.path === '/video' || req.path.startsWith('/socket.io'), // Skip rate limiting for video streaming and socket.io
});

// Store current video path (can be updated via admin endpoint)
let currentVideoPath = process.env.VIDEO_PATH || null;
// Store public URL when ngrok starts
let publicUrl = null;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(compression()); // Add compression for better performance
app.set('trust proxy', 1); // Trust first proxy for rate limiting with ngrok
app.use(limiter); // Apply general rate limiting

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'client')));

// Health check endpoint
app.get('/health', (req, res) => {
  log('info', 'Health check received');
  res.status(200).json({ status: 'ok' });
});

// Public URL endpoint
app.get('/public-url', (req, res) => {
  res.json({
    url: publicUrl,
    status: publicUrl ? 'active' : (process.env.NGROK_AUTHTOKEN ? 'starting' : 'no-token')
  });
});

// LAN URL endpoint (fallback for same-network sharing)
app.get('/lan-url', (req, res) => {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    const addrs = [];
    for (const name of Object.keys(nets)) {
      for (const n of nets[name] || []) {
        if (n.family === 'IPv4' && !n.internal) addrs.push(n.address);
      }
    }
    const uniq = Array.from(new Set(addrs));
    const port = (server.address() && server.address().port) || process.env.PORT || 3000;
    const urls = uniq.map(ip => `http://${ip}:${port}`);
    res.json({ urls });
  } catch (e) {
    res.json({ urls: [] });
  }
});

// Admin endpoint to set video path
app.post('/admin/video-path', (req, res) => {
  const { path } = req.body;
  if (path && typeof path === 'string') {
    currentVideoPath = path;
    log('info', 'Video path updated:', path);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid path' });
  }
});

// Video endpoints (no rate limiting for video streaming as it requires many requests)
app.get('/video', (req, res) => streamVideo(req, res, currentVideoPath));
app.get('/video-info', (req, res) => res.json(getVideoInfo(currentVideoPath)));

// Initialize socket synchronization
initSync(io);

// Export app and server for use by Electron
module.exports = { app, server, startServer, setLogger, detectLocalIP, get publicUrl() { return publicUrl; } };

function detectLocalIP() {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    const addrs = [];
    
    // Collect all non-internal IPv4 addresses
    for (const name of Object.keys(nets)) {
      for (const n of nets[name] || []) {
        if (n.family === 'IPv4' && !n.internal) {
          addrs.push(n.address);
        }
      }
    }
    
    // Prioritize common private network ranges
    const preferredIPs = addrs.filter(ip => {
      return ip.startsWith('192.168.') ||
             ip.startsWith('10.') ||
             ip.startsWith('172.');
    });
    
    const chosenIP = preferredIPs.length > 0 ? preferredIPs[0] : (addrs[0] || '127.0.0.1');
    log('info', `Detected local IPs: ${addrs.join(', ')}`);
    log('info', `Selected IP for ngrok: ${chosenIP}`);
    
    return chosenIP;
  } catch (error) {
    log('warn', `Failed to detect local IP: ${error.message}, using localhost`);
    return '127.0.0.1';
  }
}

// Custom logger that can be intercepted by Electron
let customLogger = null;
function setLogger(logger) {
  customLogger = logger;
}

function log(level, ...args) {
  const raw = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
  const tagged = `[${level.toUpperCase()}] ${raw}`;
  if (customLogger) {
    customLogger(level, tagged + '\n');
  } else {
    if (level === 'error') console.error(tagged); else console.log(tagged);
  }
}

// Function to start the server (called by Electron)
function startServer() {
  log('info', 'SERVER STARTSERVER FUNCTION CALLED');
  log('info', '=== SERVER STARTING ===');
  log('info', `VIDEO_PATH=${process.env.VIDEO_PATH || ''}`);
  log('info', `NGROK_AUTHTOKEN_SET=${!!process.env.NGROK_AUTHTOKEN}`);
  log('info', `NGROK_AUTHTOKEN_LENGTH=${process.env.NGROK_AUTHTOKEN ? process.env.NGROK_AUTHTOKEN.length : 0}`);
  
  const desiredPort = parseInt(process.env.PORT || '3000', 10);
  server.listen(desiredPort, '0.0.0.0', () => {
    const actualPort = server.address().port;
    
    // Detect the best local IP address for ngrok to connect to
    const localIP = detectLocalIP();
    log('info', `Server running on port ${actualPort}, detected IP: ${localIP}`);
    
    // Start ngrok if configured
    if (process.env.NGROK_AUTHTOKEN) {
      log('info', 'Starting ngrok connect');
      startNgrok(actualPort, localIP, process.env.NGROK_AUTHTOKEN).then((url) => {
        if (url && typeof url === 'string') {
          publicUrl = url.trim();
          log('info', `Public URL: ${publicUrl}`);
        } else {
          log('error', 'NGROK_FAILED no_url');
        }
      }).catch((err) => {
        log('error', `NGROK_ERROR ${err.message}`);
      });
    } else {
      log('info', 'NGROK_SKIP no_token');
    }
  }).on('error', (err) => {
    log('error', `SERVER_LISTEN_ERROR ${err.message}`);
    // Don't exit process when running as child - let parent handle it
    if (require.main === module) {
      process.exit(1);
    }
  });
}

// Only start server if this file is run directly (not when required by Electron)
if (require.main === module) {
  startServer();
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught Exception:', err);
  // Don't exit when running as child process
  if (require.main === module) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit when running as child process
  if (require.main === module) {
    process.exit(1);
  }
});