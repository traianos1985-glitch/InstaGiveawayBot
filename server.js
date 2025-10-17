const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const math = require('mathjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Larmor frequency calculation constants
const GYROMAGNETIC_RATIOS = {
  'H1': 42.577478518e6, // Hz/T for hydrogen-1
  'C13': 10.7084e6,     // Hz/T for carbon-13
  'N15': 4.3156e6,      // Hz/T for nitrogen-15
  'F19': 40.0776e6,     // Hz/T for fluorine-19
  'P31': 17.235e6       // Hz/T for phosphorus-31
};

// Real-time data storage
let realTimeData = {
  magneticField: 1.5, // Tesla
  temperature: 298.15, // Kelvin
  pressure: 101325, // Pascal
  timestamp: Date.now(),
  larmorFrequency: 0,
  nucleus: 'H1'
};

// Calculate Larmor frequency
function calculateLarmorFrequency(magneticField, nucleus = 'H1') {
  const gamma = GYROMAGNETIC_RATIOS[nucleus];
  if (!gamma) {
    throw new Error(`Unknown nucleus: ${nucleus}`);
  }
  return gamma * magneticField;
}

// Simulate real-time data changes
function simulateRealTimeData() {
  // Simulate small variations in magnetic field
  const fieldVariation = (Math.random() - 0.5) * 0.001; // ±0.5 mT variation
  realTimeData.magneticField = Math.max(0.1, 1.5 + fieldVariation);
  
  // Simulate temperature changes
  const tempVariation = (Math.random() - 0.5) * 2; // ±1K variation
  realTimeData.temperature = Math.max(273.15, 298.15 + tempVariation);
  
  // Update timestamp
  realTimeData.timestamp = Date.now();
  
  // Calculate new Larmor frequency
  try {
    realTimeData.larmorFrequency = calculateLarmorFrequency(
      realTimeData.magneticField, 
      realTimeData.nucleus
    );
  } catch (error) {
    console.error('Error calculating Larmor frequency:', error.message);
  }
}

// Chat messages storage
let chatMessages = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data
  socket.emit('initialData', realTimeData);
  socket.emit('chatHistory', chatMessages);
  
  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const chatMessage = {
      id: Date.now(),
      text: message.text,
      user: message.user || 'Anonymous',
      timestamp: new Date().toISOString(),
      type: 'user'
    };
    
    chatMessages.push(chatMessage);
    
    // Broadcast to all clients
    io.emit('newMessage', chatMessage);
    
    // Process chat commands
    if (message.text.startsWith('/')) {
      processChatCommand(socket, message.text);
    }
  });
  
  // Handle nucleus change
  socket.on('changeNucleus', (nucleus) => {
    if (GYROMAGNETIC_RATIOS[nucleus]) {
      realTimeData.nucleus = nucleus;
      realTimeData.larmorFrequency = calculateLarmorFrequency(
        realTimeData.magneticField, 
        nucleus
      );
      io.emit('dataUpdate', realTimeData);
    }
  });
  
  // Handle manual field change
  socket.on('setMagneticField', (fieldValue) => {
    if (fieldValue > 0) {
      realTimeData.magneticField = fieldValue;
      realTimeData.larmorFrequency = calculateLarmorFrequency(
        fieldValue, 
        realTimeData.nucleus
      );
      io.emit('dataUpdate', realTimeData);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Process chat commands
function processChatCommand(socket, command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  
  let response = {
    id: Date.now(),
    text: '',
    user: 'System',
    timestamp: new Date().toISOString(),
    type: 'system'
  };
  
  switch (cmd) {
    case '/help':
      response.text = `Available commands:
/help - Show this help
/status - Show current status
/nucleus <type> - Change nucleus (H1, C13, N15, F19, P31)
/field <value> - Set magnetic field in Tesla
/frequency - Show current Larmor frequency
/calculate <field> <nucleus> - Calculate frequency for specific values`;
      break;
      
    case '/status':
      response.text = `Current Status:
Magnetic Field: ${realTimeData.magneticField.toFixed(6)} T
Nucleus: ${realTimeData.nucleus}
Larmor Frequency: ${(realTimeData.larmorFrequency / 1e6).toFixed(3)} MHz
Temperature: ${realTimeData.temperature.toFixed(2)} K
Pressure: ${realTimeData.pressure} Pa`;
      break;
      
    case '/nucleus':
      if (parts[1] && GYROMAGNETIC_RATIOS[parts[1]]) {
        realTimeData.nucleus = parts[1];
        realTimeData.larmorFrequency = calculateLarmorFrequency(
          realTimeData.magneticField, 
          parts[1]
        );
        io.emit('dataUpdate', realTimeData);
        response.text = `Nucleus changed to ${parts[1]}`;
      } else {
        response.text = `Invalid nucleus. Available: ${Object.keys(GYROMAGNETIC_RATIOS).join(', ')}`;
      }
      break;
      
    case '/field':
      const fieldValue = parseFloat(parts[1]);
      if (!isNaN(fieldValue) && fieldValue > 0) {
        realTimeData.magneticField = fieldValue;
        realTimeData.larmorFrequency = calculateLarmorFrequency(
          fieldValue, 
          realTimeData.nucleus
        );
        io.emit('dataUpdate', realTimeData);
        response.text = `Magnetic field set to ${fieldValue} T`;
      } else {
        response.text = 'Invalid field value. Must be a positive number.';
      }
      break;
      
    case '/frequency':
      response.text = `Current Larmor frequency: ${(realTimeData.larmorFrequency / 1e6).toFixed(3)} MHz`;
      break;
      
    case '/calculate':
      if (parts.length >= 3) {
        const field = parseFloat(parts[1]);
        const nucleus = parts[2];
        if (!isNaN(field) && field > 0 && GYROMAGNETIC_RATIOS[nucleus]) {
          const freq = calculateLarmorFrequency(field, nucleus);
          response.text = `Larmor frequency for ${nucleus} at ${field} T: ${(freq / 1e6).toFixed(3)} MHz`;
        } else {
          response.text = 'Invalid parameters. Usage: /calculate <field> <nucleus>';
        }
      } else {
        response.text = 'Usage: /calculate <field> <nucleus>';
      }
      break;
      
    default:
      response.text = 'Unknown command. Type /help for available commands.';
  }
  
  chatMessages.push(response);
  io.emit('newMessage', response);
}

// Start real-time data simulation
setInterval(simulateRealTimeData, 1000); // Update every second

// Broadcast data updates to all clients
setInterval(() => {
  io.emit('dataUpdate', realTimeData);
}, 1000);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/data', (req, res) => {
  res.json(realTimeData);
});

app.get('/api/chat', (req, res) => {
  res.json(chatMessages);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Larmor frequency calculator with real-time data and chat interface`);
  console.log(`Available nuclei: ${Object.keys(GYROMAGNETIC_RATIOS).join(', ')}`);
});