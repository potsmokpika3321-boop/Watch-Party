const { contextBridge, ipcRenderer } = require('electron');

function safeOn(channel, cb) {
  ipcRenderer.on(channel, (_evt, data) => cb(data));
}

contextBridge.exposeInMainWorld('watchparty', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  onServerLog: (cb) => safeOn('server-log', cb),
  onVideoSelected: (cb) => safeOn('video-selected', cb),
  onNgrokState: (cb) => safeOn('ngrok-state', cb),
  onInitSettings: (cb) => safeOn('init-settings', cb),
  onPublicUrl: (cb) => safeOn('public-url', cb),
  onNgrokTestResult: (cb) => safeOn('ngrok-test-result', cb),
});

// Prevent default drag/drop navigation which can break the app and cause incidental errors
window.addEventListener('dragover', (e) => {
  e.preventDefault();
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
});
