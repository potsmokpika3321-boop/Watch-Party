const ngrok = require('@ngrok/ngrok');

// Simple tunnel management
let currentTunnel = null;

async function startNgrok(port, localIP, authtoken) {
  if (!authtoken) {
    console.log('No ngrok token provided');
    return null;
  }

  // Validate local IP
  if (!localIP || localIP === '0.0.0.0') {
    console.error('Invalid local IP for ngrok connection');
    return null;
  }

  console.log(`Setting up ngrok to connect to ${localIP}:${port}`);

  // Validate ngrok token format
  if (!authtoken || authtoken.length < 5) {
    console.error('Invalid ngrok token: token too short or missing');
    return null;
  }

  try {
    console.log('🔧 Starting ngrok tunnel...');
    console.log('🔐 Token provided:', authtoken.substring(0, 8) + '...');
    console.log('🌐 Local address:', `${localIP}:${port}`);

    // Stop any existing tunnel
    await stopNgrok();

    // Authenticate with ngrok using the agent SDK
    await ngrok.authtoken(authtoken);

    // Use ngrok.connect API with addr option
    currentTunnel = await ngrok.connect({
      addr: port, // ngrok can handle localhost automatically, just pass the port
      proto: 'http' // explicitly specify HTTP protocol
    });

    const url = currentTunnel.url();
    console.log('🔗 PUBLIC URL:', url);

    return url;

  } catch (error) {
    console.error('❌ ngrok connection failed:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      code: error.code,
      message: error.message
    });

    // Clean up on error
    await stopNgrok();

    return null;
  }
}

async function stopNgrok() {
  try {
    if (currentTunnel) {
      console.log('🔧 Closing ngrok tunnel...');
      await currentTunnel.close();
      currentTunnel = null;
      console.log('✅ ngrok tunnel closed');
    }
  } catch (error) {
    console.error('Error stopping ngrok:', error.message);
  }
}

function getCurrentUrl() {
  return currentTunnel ? currentTunnel.url() : null;
}

module.exports = { startNgrok, stopNgrok, getCurrentUrl };
