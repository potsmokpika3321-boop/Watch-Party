function initSync(io) {
  let hostId = null;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // First connection becomes host
    if (!hostId) {
      hostId = socket.id;
      console.log('New host:', socket.id);
    }
    
    // Send role to client
    socket.emit('role', { hostId });
    
    // Broadcast role to all clients
    io.emit('role', { hostId });

    socket.on('play', (time) => {
      if (socket.id === hostId) {
        socket.broadcast.emit('play', time);
      }
    });

    socket.on('pause', (time) => {
      if (socket.id === hostId) {
        socket.broadcast.emit('pause', time);
      }
    });

    socket.on('seek', (time) => {
      if (socket.id === hostId) {
        socket.broadcast.emit('seek', time);
      }
    });

    socket.on('sync-request', () => {
      if (hostId && hostId !== socket.id) {
        io.to(hostId).emit('sync-request', { requesterId: socket.id });
      }
    });

    socket.on('sync-state', (state) => {
      if (socket.id === hostId && state.requesterId) {
        io.to(state.requesterId).emit('sync-state', {
          time: state.time || 0,
          isPlaying: !!state.isPlaying
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.id === hostId) {
        // Find next available client to be host
        const sockets = Array.from(io.sockets.sockets.keys());
        hostId = sockets.find(id => id !== socket.id) || null;
        io.emit('role', { hostId });
      }
    });
  });
}

module.exports = initSync;
