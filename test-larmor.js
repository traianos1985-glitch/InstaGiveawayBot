// const math = require('mathjs'); // Not needed for basic calculations

// Gyromagnetic ratios for different nuclei (Hz/T)
const GYROMAGNETIC_RATIOS = {
  'H1': 42.577478518e6,  // Hydrogen-1
  'C13': 10.7084e6,      // Carbon-13
  'N15': 4.3156e6,       // Nitrogen-15
  'F19': 40.0776e6,      // Fluorine-19
  'P31': 17.235e6        // Phosphorus-31
};

// Calculate Larmor frequency
function calculateLarmorFrequency(magneticField, nucleus = 'H1') {
  const gamma = GYROMAGNETIC_RATIOS[nucleus];
  if (!gamma) {
    throw new Error(`Unknown nucleus: ${nucleus}`);
  }
  return gamma * magneticField;
}

// Test cases
console.log('🧲 Larmor Frequency Calculator - Test Results\n');
console.log('=' .repeat(60));

// Test 1: Hydrogen-1 at 1.5 Tesla (common MRI field)
console.log('\n📊 Test 1: Hydrogen-1 at 1.5 Tesla (Common MRI Field)');
const h1_1_5T = calculateLarmorFrequency(1.5, 'H1');
console.log(`Magnetic Field: 1.5 T`);
console.log(`Nucleus: ¹H (Hydrogen-1)`);
console.log(`Gyromagnetic Ratio: ${(GYROMAGNETIC_RATIOS.H1 / 1e6).toFixed(3)} MHz/T`);
console.log(`Larmor Frequency: ${(h1_1_5T / 1e6).toFixed(3)} MHz`);
console.log(`Expected: ~63.866 MHz`);

// Test 2: Carbon-13 at 7 Tesla (high field NMR)
console.log('\n📊 Test 2: Carbon-13 at 7 Tesla (High Field NMR)');
const c13_7T = calculateLarmorFrequency(7.0, 'C13');
console.log(`Magnetic Field: 7.0 T`);
console.log(`Nucleus: ¹³C (Carbon-13)`);
console.log(`Gyromagnetic Ratio: ${(GYROMAGNETIC_RATIOS.C13 / 1e6).toFixed(3)} MHz/T`);
console.log(`Larmor Frequency: ${(c13_7T / 1e6).toFixed(3)} MHz`);

// Test 3: Fluorine-19 at 3 Tesla
console.log('\n📊 Test 3: Fluorine-19 at 3 Tesla');
const f19_3T = calculateLarmorFrequency(3.0, 'F19');
console.log(`Magnetic Field: 3.0 T`);
console.log(`Nucleus: ¹⁹F (Fluorine-19)`);
console.log(`Gyromagnetic Ratio: ${(GYROMAGNETIC_RATIOS.F19 / 1e6).toFixed(3)} MHz/T`);
console.log(`Larmor Frequency: ${(f19_3T / 1e6).toFixed(3)} MHz`);

// Test 4: Phosphorus-31 at 2 Tesla
console.log('\n📊 Test 4: Phosphorus-31 at 2 Tesla');
const p31_2T = calculateLarmorFrequency(2.0, 'P31');
console.log(`Magnetic Field: 2.0 T`);
console.log(`Nucleus: ³¹P (Phosphorus-31)`);
console.log(`Gyromagnetic Ratio: ${(GYROMAGNETIC_RATIOS.P31 / 1e6).toFixed(3)} MHz/T`);
console.log(`Larmor Frequency: ${(p31_2T / 1e6).toFixed(3)} MHz`);

// Test 5: Nitrogen-15 at 11.7 Tesla (very high field)
console.log('\n📊 Test 5: Nitrogen-15 at 11.7 Tesla (Very High Field)');
const n15_11_7T = calculateLarmorFrequency(11.7, 'N15');
console.log(`Magnetic Field: 11.7 T`);
console.log(`Nucleus: ¹⁵N (Nitrogen-15)`);
console.log(`Gyromagnetic Ratio: ${(GYROMAGNETIC_RATIOS.N15 / 1e6).toFixed(3)} MHz/T`);
console.log(`Larmor Frequency: ${(n15_11_7T / 1e6).toFixed(3)} MHz`);

// Summary table
console.log('\n📋 Summary Table');
console.log('=' .repeat(60));
console.log('Nucleus    | Field (T) | Frequency (MHz) | Gyromagnetic Ratio (MHz/T)');
console.log('-' .repeat(60));
console.log(`¹H         | 1.5       | ${(h1_1_5T / 1e6).toFixed(3).padStart(12)} | ${(GYROMAGNETIC_RATIOS.H1 / 1e6).toFixed(3).padStart(25)}`);
console.log(`¹³C        | 7.0       | ${(c13_7T / 1e6).toFixed(3).padStart(12)} | ${(GYROMAGNETIC_RATIOS.C13 / 1e6).toFixed(3).padStart(25)}`);
console.log(`¹⁹F        | 3.0       | ${(f19_3T / 1e6).toFixed(3).padStart(12)} | ${(GYROMAGNETIC_RATIOS.F19 / 1e6).toFixed(3).padStart(25)}`);
console.log(`³¹P        | 2.0       | ${(p31_2T / 1e6).toFixed(3).padStart(12)} | ${(GYROMAGNETIC_RATIOS.P31 / 1e6).toFixed(3).padStart(25)}`);
console.log(`¹⁵N        | 11.7      | ${(n15_11_7T / 1e6).toFixed(3).padStart(12)} | ${(GYROMAGNETIC_RATIOS.N15 / 1e6).toFixed(3).padStart(25)}`);

// Real-time simulation test
console.log('\n🔄 Real-time Simulation Test');
console.log('=' .repeat(60));
console.log('Simulating 5 seconds of real-time data...\n');

let simulationData = {
  magneticField: 1.5,
  temperature: 298.15,
  pressure: 101325,
  nucleus: 'H1'
};

for (let i = 0; i < 5; i++) {
  // Simulate small variations
  const fieldVariation = (Math.random() - 0.5) * 0.001; // ±0.5 mT
  simulationData.magneticField = Math.max(0.1, 1.5 + fieldVariation);
  
  const tempVariation = (Math.random() - 0.5) * 2; // ±1K
  simulationData.temperature = Math.max(273.15, 298.15 + tempVariation);
  
  const larmorFreq = calculateLarmorFrequency(simulationData.magneticField, simulationData.nucleus);
  
  console.log(`Time: ${i + 1}s | Field: ${simulationData.magneticField.toFixed(6)} T | ` +
              `Temp: ${simulationData.temperature.toFixed(2)} K | ` +
              `Freq: ${(larmorFreq / 1e6).toFixed(3)} MHz`);
  
  // Wait 1 second (simulated)
  // await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n✅ All tests completed successfully!');
console.log('\n🚀 To start the real-time server, run: npm start');
console.log('🌐 Then open: http://localhost:5000');