const io = require('socket.io-client');

console.log('🧲 Larmor Frequency Calculator - Chat Demo');
console.log('==========================================');
console.log('');

// Connect to the server (if running)
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('💬 Chat interface is active');
  console.log('');
  console.log('Available commands:');
  console.log('  /help - Show all commands');
  console.log('  /status - Show current status');
  console.log('  /nucleus <type> - Change nucleus (H1, C13, N15, F19, P31)');
  console.log('  /field <value> - Set magnetic field in Tesla');
  console.log('  /frequency - Show current Larmor frequency');
  console.log('  /calculate <field> <nucleus> - Calculate frequency for specific values');
  console.log('');
  
  // Demo some commands
  setTimeout(() => {
    console.log('🎯 Running demo commands...');
    console.log('');
    
    // Send status command
    socket.emit('chatMessage', { text: '/status', user: 'Demo' });
    
    setTimeout(() => {
      socket.emit('chatMessage', { text: '/nucleus C13', user: 'Demo' });
    }, 1000);
    
    setTimeout(() => {
      socket.emit('chatMessage', { text: '/field 3.0', user: 'Demo' });
    }, 2000);
    
    setTimeout(() => {
      socket.emit('chatMessage', { text: '/calculate 7.0 H1', user: 'Demo' });
    }, 3000);
    
    setTimeout(() => {
      socket.emit('chatMessage', { text: '/frequency', user: 'Demo' });
    }, 4000);
    
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed - Server not running');
  console.log('💡 Start the server with: npm start');
  console.log('💡 Or run: node server.js');
  process.exit(1);
});

socket.on('initialData', (data) => {
  console.log('📊 Initial data received:');
  console.log(`   Magnetic Field: ${data.magneticField.toFixed(6)} T`);
  console.log(`   Nucleus: ${data.nucleus}`);
  console.log(`   Larmor Frequency: ${(data.larmorFrequency / 1e6).toFixed(3)} MHz`);
  console.log(`   Temperature: ${data.temperature.toFixed(2)} K`);
  console.log('');
});

socket.on('dataUpdate', (data) => {
  console.log(`🔄 Real-time update: ${(data.larmorFrequency / 1e6).toFixed(3)} MHz (${data.nucleus} at ${data.magneticField.toFixed(6)} T)`);
});

socket.on('newMessage', (message) => {
  const timestamp = new Date(message.timestamp).toLocaleTimeString();
  console.log(`💬 [${timestamp}] ${message.user}: ${message.text}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Demo ended');
  socket.disconnect();
  process.exit(0);
});

console.log('🔌 Attempting to connect to server...');
console.log('   (Make sure the server is running with: npm start)');
console.log('');