(() => {
  // Only initialize if running on HTTP/HTTPS (not file://)
  if (!window.location.protocol.startsWith('http')) {
    console.log('WatchParty client: Waiting for server connection...');
    return;
  }

  const socket = io();
  const video = document.getElementById('video');
  const statusEl = document.getElementById('status');
  const statusIndicator = document.getElementById('statusIndicator');
  const roleText = document.getElementById('roleText');
  const shareSection = document.getElementById('shareSection');
  const shareUrl = document.getElementById('shareUrl');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const lanFallback = document.getElementById('lanFallback');
  const lanUrlsEl = document.getElementById('lanUrls');
  const startVideoBtn = document.getElementById('startVideoBtn');
  const serverLogs = document.getElementById('serverLogs');
  const toggleLogsBtn = document.getElementById('toggleLogsBtn');
  const logsContent = document.getElementById('logsContent');
  const logsText = document.getElementById('logsText');

  let isHost = false;
  let publicUrl = null;
  let lastSeekTime = 0;
  let seekThrottle = 500; // Increased to 500ms to reduce seek events significantly
  let lastSyncTime = 0;
  let syncThrottle = 1000; // Increased to 1 second to reduce play/pause spam
  let statusUpdateThrottle = 1000; // Throttle status updates more aggressively
  let lastStatusUpdate = 0;
  let serverLogsVisible = false;
  let logBuffer = [];

  // Server logs functionality
  function toggleServerLogs() {
    serverLogsVisible = !serverLogsVisible;
    logsContent.style.display = serverLogsVisible ? 'block' : 'none';
    toggleLogsBtn.textContent = serverLogsVisible ? 'Hide' : 'Show';
  }

  function addServerLog(message) {
    logBuffer.push(message);
    if (logBuffer.length > 100) {
      logBuffer.shift(); // Keep only last 100 logs
    }
    if (logsText) {
      logsText.textContent = logBuffer.join('');
      // Auto-scroll to bottom
      logsContent.scrollTop = logsContent.scrollHeight;
    }
  }

  if (toggleLogsBtn) {
    toggleLogsBtn.addEventListener('click', toggleServerLogs);
  }

  // Listen for server logs from Electron
  if (window.watchparty) {
    window.watchparty.onServerLog((msg) => {
      addServerLog(msg);
      // Show logs section if we get server logs
      if (serverLogs) {
        serverLogs.style.display = 'block';
      }
    });
  }

  // Listen for public URL updates from Electron
  if (window.watchparty) {
    window.watchparty.onPublicUrl((url) => {
      publicUrl = url;
      updateShareSection();
    });
  }

  function setStatus(text, type = 'connecting') {
    const now = Date.now();
    if (now - lastStatusUpdate < statusUpdateThrottle && type === 'connected') {
      return; // Throttle frequent status updates
    }
    lastStatusUpdate = now;

    if (statusEl) {
      statusEl.textContent = text;

      // Update status indicator styling
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${type}`;
        if (type === 'connected') {
          statusIndicator.classList.add('status-change');
        }
      }
    }
  }

  function setRole(text, isHostRole = false) {
    if (roleText) {
      roleText.textContent = text;
      roleText.className = isHostRole ? 'role-text host' : 'role-text';
    }
  }

  // Load video info and setup
  async function loadVideo() {
    try {
      console.log('Loading video...');
      setStatus('Loading video...', 'connecting');

      // Check if video exists
      const response = await fetch('/video-info');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.exists) {
        setStatus('No video file selected', 'error');
        return false;
      }

      // Set video source with optimized loading for remote viewers
      video.src = '/video';
      video.preload = 'metadata'; // Load metadata first
      video.autoplay = false; // Don't autoplay
      video.buffered = true; // Enable buffering
      video.setAttribute('playsinline', ''); // Better mobile performance

      // Optimize video element for remote streaming
      video.addEventListener('loadstart', () => {
        video.volume = 0.5; // Set reasonable default volume
      });

      // Add buffering event listeners for better remote performance
      video.addEventListener('waiting', () => {
        console.log('Video buffering...');
        setStatus('Buffering...', 'connecting');
      });

      video.addEventListener('canplay', () => {
        console.log('Video ready to play');
        setStatus('Ready to watch', 'connected');
      });

      video.addEventListener('progress', () => {
        // Monitor buffering progress
        if (video.buffered.length > 0) {
          const buffered = video.buffered.end(0);
          const duration = video.duration;
          const bufferedPercent = (buffered / duration) * 100;
          console.log(`Buffered: ${bufferedPercent.toFixed(1)}%`);
        }
      });

      console.log('Video source set with remote optimizations');
      setStatus('Video ready', 'connected');
      return true;

    } catch (err) {
      console.error('Video load error:', err);
      setStatus('Video load failed', 'error');
      return false;
    }
  }

  // Load public URL info
  async function loadPublicUrl() {
    try {
      const response = await fetch('/public-url');
      const data = await response.json();
      publicUrl = data.url;
      updateShareSection();
    } catch (err) {
      console.error('Failed to load public URL:', err);
      publicUrl = null;
      updateShareSection();
    }
  }

  // Poll for public URL until available (extra safety for packaged app)
  let publicUrlPoll = null;
  function startPublicUrlPolling() {
    if (publicUrlPoll) return;
    const tick = async () => {
      try {
        const res = await fetch('/public-url');
        const json = await res.json();
        if (json && json.url) {
          publicUrl = json.url;
          updateShareSection();
          clearInterval(publicUrlPoll);
          publicUrlPoll = null;
        }
      } catch (_) { /* ignore */ }
    };
    tick();
    publicUrlPoll = setInterval(tick, 1000);
  }

  // Update share section visibility and content
  function updateShareSection() {
    if (!shareSection || !shareUrl) return;

    if (publicUrl) {
      shareSection.style.display = 'block';
      shareUrl.value = publicUrl;
      if (lanFallback) lanFallback.style.display = 'none';
    } else {
      // No public URL yet; try to show LAN links as a fallback
      shareSection.style.display = 'block';
      shareUrl.value = '';
      if (lanFallback) {
        lanFallback.style.display = 'block';
        loadLanUrls();
      }
    }
  }

  async function loadLanUrls() {
    try {
      const res = await fetch('/lan-url');
      const { urls } = await res.json();
      if (lanUrlsEl) {
        if (urls && urls.length) {
          lanUrlsEl.innerHTML = urls.map(u => `<a href="${u}" target="_blank">${u}</a>`).join(' · ');
        } else {
          lanUrlsEl.textContent = '(no LAN addresses)';
        }
      }
    } catch (_) {
      if (lanUrlsEl) lanUrlsEl.textContent = '';
    }
  }

  // Copy link functionality
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      if (publicUrl) {
        try {
          await navigator.clipboard.writeText(publicUrl);
          setStatus('Link copied to clipboard!', 'connected');
          setTimeout(() => setStatus('Connected', 'connected'), 2000);
        } catch (err) {
          console.error('Failed to copy link:', err);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = publicUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setStatus('Link copied to clipboard!', 'connected');
          setTimeout(() => setStatus('Connected', 'connected'), 2000);
        }
      }
    });
  }

  // Audio enable function
  function enableAudioPlayback() {
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjK8DwznNgwrFzOn2';
    silentAudio.volume = 0;
    silentAudio.play().then(() => {
      silentAudio.remove();
    }).catch(() => {
      silentAudio.remove();
    });
  }

  // Video click to enable audio
  video.addEventListener('click', () => {
    enableAudioPlayback();
  });

  // Volume change handler
  video.addEventListener('volumechange', () => {
    console.log('Volume changed:', video.muted ? 'muted' : 'unmuted');
  });

  // Start Video button
  if (startVideoBtn) {
    startVideoBtn.addEventListener('click', async () => {
      setStatus('Starting video...', 'host');
      enableAudioPlayback();

      video.currentTime = 0;
      video.muted = true;

      try {
        await video.play();
        video.muted = false;
        setStatus('🎬 Hosting! Friends can now join', 'host');
      } catch (err) {
        console.log('Video play failed:', err);
        video.muted = false;
        setStatus('🎬 Hosting! Click video to start playing', 'host');
      }
    });
  }

  // Socket.io event handlers
  socket.on('connect', () => {
    console.log('Connected to server');
    setStatus('Connected', 'connected');
    loadVideo();
    loadPublicUrl(); // One-shot check
    startPublicUrlPolling(); // Keep checking until ngrok is ready
  });

  socket.on('role', (data) => {
    isHost = data.hostId === socket.id;
    setRole(isHost ? 'You are the host' : 'Connected as viewer', isHost);
    setStatus(isHost ? 'Ready to host' : 'Connected as viewer', 'connected');

    if (startVideoBtn) {
      startVideoBtn.style.display = isHost ? 'flex' : 'none';
    }

    // Show home button only for host
    const backHomeBtn = document.getElementById('backHomeBtn');
    if (backHomeBtn) {
      backHomeBtn.style.display = isHost ? 'inline-block' : 'none';
    }
  });

  socket.on('play', async (time) => {
    video.currentTime = time;
    try {
      await video.play();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.log('Autoplay blocked - waiting for user interaction');
        setStatus('Click to start watching', 'connecting');
      } else {
        console.error('Video play error:', error);
      }
    }
  });

  socket.on('pause', (time) => {
    video.currentTime = time;
    video.pause();
  });

  socket.on('seek', (time) => {
    video.currentTime = time;
  });

  // Host controls
  video.addEventListener('play', () => {
    if (isHost) socket.emit('play', video.currentTime);
  });

  video.addEventListener('pause', () => {
    if (isHost) socket.emit('pause', video.currentTime);
  });

  video.addEventListener('seeking', () => {
    if (isHost) socket.emit('seek', video.currentTime);
  });

  // Video event handlers
  video.addEventListener('error', (e) => {
    console.error('Video error:', e);
    setStatus('Error loading video - check if video file exists', 'error');
  });

  video.addEventListener('loadedmetadata', () => {
    console.log('Video loaded successfully');
    setStatus('Video ready', 'connected');

    if (isHost) {
      video.controls = true;
    }
    video.muted = false;
  });

  video.addEventListener('loadstart', () => {
    setStatus('Loading video...', 'connecting');
  });

  video.addEventListener('canplay', () => {
    setStatus('Ready to watch', 'connected');
  });

  video.addEventListener('play', () => {
    console.log('Video started playing');
    setStatus('Playing', 'connected');
  });

  video.addEventListener('pause', () => {
    console.log('Video paused');
    setStatus('Paused', 'connected');
  });

  // Initialize
  loadVideo();
  loadPublicUrl();
  startPublicUrlPolling();
})();
