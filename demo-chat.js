#!/usr/bin/env node

// Demo script showing chat commands for Larmor frequency calculator
const io = require('socket.io-client');

console.log('💬 Larmor Frequency Calculator - Chat Demo');
console.log('==========================================\n');

// Connect to the server (assuming it's running on port 3000)
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('📝 Sending demo chat commands...\n');
  
  // Demo commands
  const commands = [
    '/help',
    '/status',
    '/frequency',
    '/nucleus C13',
    '/field 3.0',
    '/calculate 7.0 H1',
    '/nucleus F19',
    '/field 1.5'
  ];
  
  let commandIndex = 0;
  
  const sendNextCommand = () => {
    if (commandIndex < commands.length) {
      const command = commands[commandIndex];
      console.log(`👤 User: ${command}`);
      socket.emit('chatMessage', {
        text: command,
        user: 'Demo User'
      });
      commandIndex++;
      setTimeout(sendNextCommand, 2000); // Wait 2 seconds between commands
    } else {
      console.log('\n✅ Demo completed! Check the web interface for responses.');
      setTimeout(() => {
        socket.disconnect();
        process.exit(0);
      }, 1000);
    }
  };
  
  // Start sending commands after a short delay
  setTimeout(sendNextCommand, 1000);
});

socket.on('newMessage', (message) => {
  if (message.user === 'System') {
    console.log(`🤖 System: ${message.text}`);
  }
});

socket.on('dataUpdate', (data) => {
  console.log(`📊 Data Update: Field=${data.magneticField.toFixed(3)}T, Freq=${(data.larmorFrequency/1e6).toFixed(3)}MHz, Nucleus=${data.nucleus}`);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
  console.log('💡 Make sure the server is running: npm start');
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Demo interrupted. Goodbye!');
  socket.disconnect();
  process.exit(0);
});