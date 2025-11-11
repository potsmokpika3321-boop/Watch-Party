const path = require('path');
const fs = require('fs');

module.exports = {
  PORT: process.env.PORT || 3000,
  // Dynamic video path - must be provided when server starts
  get VIDEO_PATH() {
    const videoPath = process.env.VIDEO_PATH;
    if (!videoPath) {
      return null;
    }
    
    // Verify the file exists
    if (!fs.existsSync(videoPath)) {
      return null;
    }
    
    return videoPath;
  },
  // Set your ngrok authtoken to enable public link
  get NGROK_AUTHTOKEN() {
    return process.env.NGROK_AUTHTOKEN;
  },
  // Set ENABLE_NGROK=false to disable ngrok even if a token is provided
  get ENABLE_NGROK() {
    return process.env.ENABLE_NGROK !== 'false';
  },
};
