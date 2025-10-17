# Larmor Frequency Calculator with Real-time Data

A comprehensive web application for calculating Larmor frequencies in nuclear magnetic resonance (NMR) and magnetic resonance imaging (MRI) with real-time data processing and interactive chat interface.

## 🧲 What is Larmor Frequency?

The Larmor frequency is the frequency at which atomic nuclei precess in a magnetic field. It's fundamental to NMR and MRI technologies and is calculated using the formula:

**ω = γ × B₀**

Where:
- ω = Larmor frequency (Hz)
- γ = Gyromagnetic ratio (Hz/T) - specific to each nucleus
- B₀ = Magnetic field strength (Tesla)

## ✨ Features

- **Real-time Larmor frequency calculation** for multiple nuclei
- **Interactive web interface** with live data updates
- **Chat system** with command support for system control
- **WebSocket communication** for real-time data streaming
- **Support for 5 different nuclei**: ¹H, ¹³C, ¹⁵N, ¹⁹F, ³¹P
- **Real-time data simulation** with realistic variations
- **Modern, responsive UI** with beautiful animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/traianos1985-glitch/InstaGiveawayBot.git
   cd InstaGiveawayBot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test script:**
   ```bash
   node test-larmor.js
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🎯 Usage

### Web Interface

The web interface provides:
- **Real-time data display** showing current magnetic field, temperature, pressure, and Larmor frequency
- **Interactive controls** to change nucleus type and magnetic field strength
- **Live updates** every second with simulated real-time data
- **Chat interface** for system interaction

### Chat Commands

Use these commands in the chat interface:

- `/help` - Show all available commands
- `/status` - Display current system status
- `/nucleus <type>` - Change nucleus (H1, C13, N15, F19, P31)
- `/field <value>` - Set magnetic field in Tesla
- `/frequency` - Show current Larmor frequency
- `/calculate <field> <nucleus>` - Calculate frequency for specific values

### Example Commands

```
/status
/nucleus C13
/field 3.0
/calculate 7.0 H1
```

## 🧪 Supported Nuclei

| Nucleus | Symbol | Gyromagnetic Ratio | Common Use |
|---------|--------|-------------------|------------|
| Hydrogen-1 | ¹H | 42.577 MHz/T | Most common in organic compounds |
| Carbon-13 | ¹³C | 10.708 MHz/T | Carbon analysis in organic compounds |
| Nitrogen-15 | ¹⁵N | 4.316 MHz/T | Protein and nucleic acid analysis |
| Fluorine-19 | ¹⁹F | 40.078 MHz/T | Pharmaceutical and material analysis |
| Phosphorus-31 | ³¹P | 17.235 MHz/T | Biological system analysis |

## 🔧 Technical Details

### Architecture
- **Backend**: Node.js with Express.js
- **Real-time communication**: Socket.IO
- **Frontend**: Vanilla JavaScript with modern CSS
- **Mathematical calculations**: Math.js library

### Real-time Data Simulation
The system simulates realistic variations in:
- Magnetic field strength (±0.5 mT variation)
- Temperature (±1K variation)
- Pressure (constant at 101325 Pa)

### API Endpoints
- `GET /` - Main web interface
- `GET /api/data` - Current system data (JSON)
- `GET /api/chat` - Chat message history (JSON)

## 🧮 Mathematical Background

### Larmor Frequency Formula
```
ω₀ = γ × B₀
```

### Gyromagnetic Ratios
The gyromagnetic ratio (γ) is a fundamental property of each nucleus:
- **H1**: 42.577478518 × 10⁶ Hz/T
- **C13**: 10.7084 × 10⁶ Hz/T
- **N15**: 4.3156 × 10⁶ Hz/T
- **F19**: 40.0776 × 10⁶ Hz/T
- **P31**: 17.235 × 10⁶ Hz/T

### Example Calculation
For ¹H at 1.5 Tesla:
```
ω₀ = 42.577 × 10⁶ Hz/T × 1.5 T = 63.866 × 10⁶ Hz = 63.866 MHz
```

## 🛠️ Development

### Project Structure
```
├── server.js              # Main server file
├── test-larmor.js         # Test script
├── package.json           # Dependencies
├── public/
│   └── index.html         # Web interface
└── README.md              # This file
```

### Running in Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Testing
```bash
node test-larmor.js  # Run calculation tests
```

## 🌐 Real-time Features

- **Live data updates** every second
- **WebSocket communication** for instant updates
- **Chat system** with persistent message history
- **Interactive controls** that update in real-time
- **Status indicators** showing connection state

## 📊 Use Cases

- **Educational purposes** - Learning NMR/MRI physics
- **Research applications** - Quick frequency calculations
- **Laboratory work** - Real-time monitoring
- **Development** - Testing NMR equipment parameters

## 🔮 Future Enhancements

- [ ] Support for more nuclei
- [ ] Custom gyromagnetic ratio input
- [ ] Data logging and export
- [ ] Mobile app version
- [ ] Integration with actual NMR equipment
- [ ] Advanced visualization tools

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For questions or issues, please open an issue on GitHub or use the chat interface in the application.

---

**Note**: This application is for educational and research purposes. Always verify calculations with established references for critical applications.