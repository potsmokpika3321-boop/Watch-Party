const fs = require('fs');
const path = require('path');

// Simple MIME type mapping for common video formats
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska'
  };
  return mimeTypes[ext] || 'video/mp4'; // Default to mp4
}

function streamVideo(req, res, videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Basic MIME type
  const contentType = getMimeType(videoPath);

  // Add performance headers optimized for remote streaming
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Allow browser caching for 1 hour
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (range) {
    // Handle range requests for seeking with larger chunks for better performance
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1); // 1MB chunks

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable');
      return;
    }

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end, highWaterMark: 64 * 1024 }); // 64KB buffer

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Transfer-Encoding': 'chunked',
    });

    file.pipe(res);
  } else {
    // Serve full video with optimized streaming
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Transfer-Encoding': 'chunked',
    });

    const file = fs.createReadStream(videoPath, { highWaterMark: 128 * 1024 }); // 128KB buffer
    file.pipe(res);
  }
}

function getVideoInfo(videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    return { exists: false };
  }

  const stat = fs.statSync(videoPath);
  return {
    exists: true,
    size: stat.size,
    contentType: getMimeType(videoPath)
  };
}

module.exports = { streamVideo, getVideoInfo };
