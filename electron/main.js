const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const { app, BrowserWindow, dialog, Menu, shell, ipcMain, clipboard, safeStorage } = require('electron');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let serverProcess = null;
let currentVideoPath = null; // user-chosen video file path
let currentNgrokToken = process.env.NGROK_AUTHTOKEN || null;
let publicUrl = null;
let ngrokPollInterval = null;
let serverPort = 3000; // dynamically selected port (fallback 3000)

// ---------------------------
// Auto-updater configuration
// ---------------------------
autoUpdater.autoDownload = false; // Let user choose when to download
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

autoUpdater.on('checking-for-update', () => {
  broadcastLog('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  broadcastLog(`Update available: ${info.version}`);
  broadcastEvent('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  broadcastLog('No updates available');
  broadcastEvent('update-not-available');
});

autoUpdater.on('error', (err) => {
  broadcastLog(`Update error: ${err.message}`);
  broadcastEvent('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  broadcastEvent('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  broadcastLog(`Update downloaded: ${info.version}`);
  broadcastEvent('update-downloaded', info);
});

// ---------------------------
// Helpers to talk to renderer
// ---------------------------
function broadcastEvent(channel, payload) {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) {
      try { w.webContents.send(channel, payload); } catch (_) {}
    }
  });
}
function broadcastLog(message) {
  const text = typeof message === 'string' ? message : String(message);
  console.log('SERVER LOG:', text); // Also log to terminal for debugging
  broadcastEvent('server-log', text.endsWith('\n') ? text : text + '\n');
}

// ---------------------------
// Ngrok polling (/public-url)
// ---------------------------
function clearNgrokPolling() {
  if (ngrokPollInterval) { clearInterval(ngrokPollInterval); ngrokPollInterval = null; }
}
function startNgrokPolling() {
  clearNgrokPolling();
  broadcastLog('Starting public URL polling...');
  let lastStatus = '';
  const poll = () => {
    try {
      http.get(`http://127.0.0.1:${serverPort}/public-url`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            if (json && json.url) {
              if (publicUrl !== json.url) {
                publicUrl = json.url;
                updateWindowTitle();
                buildMenu();
                broadcastEvent('public-url', publicUrl);
                broadcastLog(`Public URL: ${publicUrl}`);
              }
              clearNgrokPolling();
            } else if (json && json.status && json.status !== lastStatus) {
              lastStatus = json.status;
              broadcastLog(`ngrok status: ${json.status}`);
            }
          } catch (_) {}
        });
      }).on('error', () => {});
    } catch (_) {}
  };
  poll();
  ngrokPollInterval = setInterval(poll, 1000);
}

// ---------------
// UI + Menu state
// ---------------
function updateWindowTitle() {
  if (!mainWindow) return;
  const parts = ['WatchParty'];
  if (currentVideoPath) parts.push(path.basename(currentVideoPath));
  if (publicUrl) parts.push(`[Public: ${publicUrl}]`);
  mainWindow.setTitle(parts.join(' • '));
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Video…',
          accelerator: 'Ctrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              title: 'Select Video File',
              properties: ['openFile'],
              filters: [
                { name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'mov'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            });
            if (!canceled && filePaths && filePaths[0]) {
              currentVideoPath = filePaths[0];
              publicUrl = null; // reset until server restarts & ngrok prints again
              if (serverProcess) startServer();
              updateWindowTitle();
              saveConfig();
            }
          },
        },
        {
          label: 'Back to Home',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadFile(path.join(__dirname, 'welcome.html')).catch(() => {});
            }
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Public',
      submenu: [
        {
          label: 'Set ngrok authtoken…',
          click: () => openNgrokTokenDialog(),
        },
        {
          label: 'Copy Public URL',
          enabled: !!publicUrl,
          click: () => { if (publicUrl) clipboard.writeText(publicUrl); },
        },
        {
          label: 'Open Public URL in Browser',
          enabled: !!publicUrl,
          click: () => { if (publicUrl) shell.openExternal(publicUrl); },
        },
      ],
    },
    {
      label: 'Server',
      submenu: [
        { label: 'Start Server', enabled: !serverProcess, click: () => startServer() },
        { label: 'Stop Server', enabled: !!serverProcess, click: () => stopServer() },
        { label: 'Restart Server', enabled: !!serverProcess, click: () => startServer() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Updates',
      submenu: [
        {
          label: 'Check for Updates…',
          click: () => autoUpdater.checkForUpdates(),
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ----------------
// Server lifecycle
// ----------------
function resolveServerScript() {
  const candidates = [
    path.join(__dirname, '..', 'server', 'index.js'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'server', 'index.js'),
    path.join(process.resourcesPath || '', 'server', 'index.js'),
    path.join(__dirname, 'server', 'index.js'),
    path.join(__dirname, 'index.js'),
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return p; }
  return null;
}

function waitForServerReady(timeoutMs = 30000, intervalMs = 500) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) return resolve(false);
      const req = http.get(`http://127.0.0.1:${serverPort}/health`, (res) => {
        if (res.statusCode === 200) { res.resume(); return resolve(true); }
        res.resume(); setTimeout(check, intervalMs);
      });
      req.on('error', () => setTimeout(check, intervalMs));
    };
    check();
  });
}

function syncVideoPathWithServer() {
  if (!currentVideoPath) return;
  try {
    const payload = JSON.stringify({ path: currentVideoPath });
    const req = http.request({
      hostname: '127.0.0.1', port: serverPort, path: '/admin/video-path', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => { res.resume(); });
    req.on('error', () => {});
    req.write(payload); req.end();
  } catch (_) {}
}

function stopServer() {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (_) {}
    serverProcess = null;
  }
  clearNgrokPolling();
  buildMenu();
}

async function startServer() {
  // stop any existing server
  if (serverProcess) { try { serverProcess.kill(); } catch (_) {} serverProcess = null; }
  clearNgrokPolling();

  const serverScript = resolveServerScript();
  if (!serverScript) {
    const msg = 'Server script not found';
    broadcastLog('ERROR: ' + msg);
    return;
  }
  broadcastLog(`Resolved server script: ${serverScript}`);

  const serverEnv = { ...process.env };
  if (currentVideoPath) serverEnv.VIDEO_PATH = currentVideoPath;
  if (currentNgrokToken) serverEnv.NGROK_AUTHTOKEN = currentNgrokToken;

  // Create .env file with the token for the server to load
  if (currentNgrokToken) {
    try {
      const envPath = path.join(__dirname, '..', '.env');
      fs.writeFileSync(envPath, `NGROK_AUTHTOKEN=${currentNgrokToken}\n`);
      console.log('Created .env file with ngrok token');
    } catch (e) {
      console.log('Failed to create .env file:', e.message);
    }
  }

  // Dynamically find an open port starting at 3000 (retry up to +20 ports)
  async function findFreePort(start = 3000, maxAttempts = 20) {
    const net = require('net');
    function tryPort(p) {
      return new Promise((resolve) => {
        const srv = net.createServer();
        srv.once('error', () => { resolve(false); });
        srv.once('listening', () => { srv.close(() => resolve(true)); });
        srv.listen(p, '0.0.0.0');
      });
    }
    for (let i = 0; i < maxAttempts; i++) {
      const p = start + i;
      /* eslint-disable no-await-in-loop */
      const ok = await tryPort(p);
      if (ok) return p;
    }
    return start; // fallback
  }

  serverPort = await findFreePort(3000, 25);
  serverEnv.PORT = String(serverPort);
  broadcastLog(`Starting server on port ${serverPort} with VIDEO_PATH=${serverEnv.VIDEO_PATH || ''}`);

  // Try in-process first
  const originalEnv = { ...process.env };
  let ranInProcess = false;
  try {
    Object.assign(process.env, serverEnv);
  const mod = require(serverScript);
  try { broadcastLog(`Server module keys: ${Object.keys(mod).join(', ')}`); } catch (_) {}
    if (mod && typeof mod.startServer === 'function') {
      if (typeof mod.setLogger === 'function') {
        mod.setLogger((level, message) => {
          try {
            if (String(level).toLowerCase() === 'error') {
              broadcastLog(`ERROR: ${message}`);
            } else {
              broadcastLog(message);
            }
          } catch (_) { broadcastLog(message); }
        });
      }
      mod.startServer();
      ranInProcess = true;
      // Pseudo process for uniform lifecycle
      serverProcess = {
        kill: () => { try { mod.server && mod.server.close(); } catch (_) {} },
      };
    }
  } catch (e) {
    broadcastLog(`In-process server failed: ${e.message}`);
  } finally {
    Object.assign(process.env, originalEnv);
  }

  if (ranInProcess) {
    buildMenu();
    waitForServerReady().then((ok) => {
      if (ok) {
        broadcastLog('Server ready, loading client page');
        syncVideoPathWithServer();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`http://localhost:${serverPort}`);
        startNgrokPolling();
      } else {
        broadcastLog('Server failed to respond to health check');
      }
    });
    return;
  }

  // Fallback: spawn external Node process
  let nodeCmd = process.platform === 'win32' ? 'node.exe' : 'node';
  if (process.platform === 'win32' && process.resourcesPath) {
    const candidate = path.join(path.dirname(process.execPath), 'node.exe');
    if (fs.existsSync(candidate)) nodeCmd = candidate;
  }
  try {
    serverProcess = spawn(nodeCmd, [serverScript], {
      cwd: path.dirname(serverScript), env: serverEnv, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    broadcastLog(`Failed to spawn server: ${e.message}`);
    buildMenu();
    return;
  }

  serverProcess.stdout && serverProcess.stdout.on('data', (d) => {
    const text = d.toString();
    broadcastLog(text);
    const m = text.match(/Public URL:\s*(https?:\/\/\S+)/i);
    if (m) {
      publicUrl = m[1]; updateWindowTitle(); buildMenu(); broadcastEvent('public-url', publicUrl);
    }
  });
  serverProcess.stderr && serverProcess.stderr.on('data', (d) => {
    const text = d.toString();
    // Heuristic: treat deprecations/experimental notices as warnings, not fatal errors
    const isWarn = /\b(deprecation|deprecated|experimental|warning)\b/i.test(text) && !/\berror\b/i.test(text);
    broadcastLog((isWarn ? 'WARN: ' : 'ERROR: ') + text);
  });
  serverProcess.on && serverProcess.on('exit', (code) => {
    broadcastLog(`Server exited ${code}`); serverProcess = null; buildMenu(); clearNgrokPolling();
  });

  buildMenu();
  waitForServerReady().then((ok) => {
    if (ok) {
      broadcastLog('Server ready, loading client page');
      syncVideoPathWithServer();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`http://localhost:${serverPort}`);
      startNgrokPolling();
    } else {
      broadcastLog('Server failed to respond to health check');
    }
  });
}

// -----------------
// Windows / Modals
// -----------------
function openNgrokTokenDialog() {
  // This function is now deprecated - settings are handled via modal in welcome.html
  // Keep for backward compatibility but it won't be called anymore
  console.log('openNgrokTokenDialog called but modal is now handled in welcome.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'television.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true },
    show: false,
  });

  mainWindow.on('close', (event) => {
    if (serverProcess) {
      event.preventDefault();
      try { serverProcess.kill(); } catch (_) {}
      serverProcess = null;
      setTimeout(() => { if (!mainWindow.isDestroyed()) mainWindow.destroy(); }, 400);
      return;
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'welcome.html')).catch(() => {});

  // If the user navigates back to the welcome (home) page, stop the server and reset state
  const welcomeFile = path.join(__dirname, 'welcome.html');
  const welcomeUrl = pathToFileURL(welcomeFile).toString();
  const isWelcome = (u) => {
    try {
      return typeof u === 'string' && (u === welcomeUrl || /welcome\.html(\?|#|$)/i.test(u));
    } catch (_) { return false; }
  };

  const onNavigateHome = (_event, urlStr) => {
    if (isWelcome(urlStr)) {
      broadcastLog('Navigated to home — stopping server and resetting');
      stopServer();
      publicUrl = null;
      updateWindowTitle();
      buildMenu();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ngrok-state', { hasToken: !!currentNgrokToken });
        mainWindow.webContents.send('video-selected', { path: currentVideoPath || '' });
      }
    }
  };

  mainWindow.webContents.on('did-navigate', onNavigateHome);
  mainWindow.webContents.on('did-navigate-in-page', onNavigateHome);

  updateWindowTitle();
  mainWindow.webContents.once('did-finish-load', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('video-selected', { path: currentVideoPath || '' });
      mainWindow.webContents.send('ngrok-state', { hasToken: !!currentNgrokToken });
    }
  });
}

// -------------
// App lifecycle
// -------------
app.whenReady().then(() => {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) { app.quit(); return; }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.watchparty.app');
  }

  loadConfig();
  buildMenu();
  createWindow();

  // Check for updates (only in production)
  if (!app.isPackaged) {
    broadcastLog('Running in development mode - skipping update check');
  } else {
    // Check for updates after a short delay to allow the app to fully start
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
});

app.on('before-quit', () => { if (serverProcess) { try { serverProcess.kill(); } catch (_) {} serverProcess = null; } });
process.on('exit', () => { if (serverProcess) { try { serverProcess.kill(); } catch (_) {} } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// -------------
// IPC Handlers
// -------------
ipcMain.on('save-ngrok-token', (_evt, token) => {
  const newToken = (token || '').trim() || null;
  const changed = newToken !== currentNgrokToken;
  currentNgrokToken = newToken;
  if (changed) {
    publicUrl = null;
    if (serverProcess) startServer();
    buildMenu(); updateWindowTitle(); saveConfig();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('ngrok-state', { hasToken: !!currentNgrokToken });
  }
});

ipcMain.on('test-ngrok-token', async (_evt, token) => {
  const testToken = (token || '').trim();
  if (!testToken) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ngrok-test-result', { success: false, error: 'No token provided' });
    }
    return;
  }

  try {
    // Test the token by attempting to authenticate with ngrok
    const ngrok = require('@ngrok/ngrok');
    await ngrok.authtoken(testToken);
    
    // Try to create a test connection (this will fail but validate the token)
    try {
      const testListener = await ngrok.connect({ addr: 3000, proto: 'http' });
      await testListener.close();
    } catch (connectError) {
      // Connection failure is expected since we're not actually serving on 3000
      // But if we get here, authentication succeeded
      if (connectError.message.includes('connection refused') || connectError.message.includes('ECONNREFUSED')) {
        // This is expected - token is valid
      } else {
        throw connectError;
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ngrok-test-result', { success: true });
    }
  } catch (error) {
    console.error('ngrok token test failed:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ngrok-test-result', { success: false, error: error.message });
    }
  }
});

ipcMain.on('server-start', () => startServer());
ipcMain.on('server-stop', () => stopServer());
ipcMain.on('open-ngrok-settings', () => openNgrokTokenDialog());
ipcMain.on('choose-video', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Video File', properties: ['openFile'],
    filters: [ { name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'mov'] }, { name: 'All Files', extensions: ['*'] } ],
  });
  if (!canceled && filePaths && filePaths[0]) {
    currentVideoPath = filePaths[0];
    publicUrl = null;
    if (serverProcess) startServer();
    updateWindowTitle(); saveConfig();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('video-selected', { path: currentVideoPath });
  }
});

ipcMain.on('navigate-home', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'welcome.html')).catch(() => {});
  }
});

ipcMain.on('get-current-ngrok-token', (_evt) => {
  // Send current token to renderer (will be handled by modal)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('current-ngrok-token', currentNgrokToken || '');
  }
});

// -----------------
// Update IPC handlers
// -----------------
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// -----------------
// Settings storage
// -----------------
function getConfigPath() {
  // Use AppData for universal PC discovery - this allows config to be found across users
  try {
    const dir = app.getPath('userData');
    console.log('Using AppData directory for universal PC config:', dir);
    return path.join(dir, 'settings.json');
  } catch (error) {
    console.error('Error accessing AppData, falling back to app directory:', error.message);
    // Fallback to app directory if AppData access fails
    if (process.resourcesPath) {
      return path.join(process.resourcesPath, 'settings.json');
    } else {
      return path.join(__dirname, '..', 'settings.json');
    }
  }
}
function loadConfig() {
  try {
    const p = getConfigPath();
    console.log('Loading config from app-relative path:', p);
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log('Config keys loaded:', Object.keys(json));
      // Prefer encrypted token if present and available, else fallback to plaintext
      if (json.ngrokTokenEnc && safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
        try {
          const buf = Buffer.from(json.ngrokTokenEnc, 'base64');
          currentNgrokToken = safeStorage.decryptString(buf);
          console.log('✅ Decrypted ngrok token');
        } catch (_) {
          // If decryption fails, fallback to plaintext if present
          if (json.ngrokToken) currentNgrokToken = json.ngrokToken;
          console.log('⚠️ Decryption failed, using plaintext ngrok token');
        }
      } else if (json.ngrokToken) {
        currentNgrokToken = json.ngrokToken;
        console.log('✅ Using plaintext ngrok token');
      }
      if (json.videoPath) currentVideoPath = json.videoPath;
      console.log('✅ Config loaded successfully (NO APPDATA)');
    } else {
      console.log('📁 Config file does not exist, will create at:', p);
      // For dev, try to load from a dev settings file
      const devPath = path.join(__dirname, '..', 'settings.json');
      console.log('Trying dev settings at:', devPath);
      if (fs.existsSync(devPath)) {
        console.log('📁 Loading from dev settings');
        const json = JSON.parse(fs.readFileSync(devPath, 'utf8'));
        if (json.ngrokToken) currentNgrokToken = json.ngrokToken;
        if (json.videoPath) currentVideoPath = json.videoPath;
        console.log('✅ Loaded from dev settings (NO APPDATA)');
      }
    }
  } catch (e) {
    console.log('⚠️ Error loading config:', e.message);
  }
}
function saveConfig() {
  try {
    const p = getConfigPath();
    const data = { videoPath: currentVideoPath || '' };
    const token = (currentNgrokToken || '').trim();
    try {
      if (token && safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
        const enc = safeStorage.encryptString(token);
        data.ngrokTokenEnc = Buffer.from(enc).toString('base64');
      } else {
        // Fallback to plaintext when encryption API not available
        data.ngrokToken = token;
      }
    } catch (_) {
      // On any encryption error, fallback to plaintext
      data.ngrokToken = token;
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}
 
