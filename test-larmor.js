#!/usr/bin/env node

// Test script for Larmor frequency calculation
const math = require('mathjs');

// Gyromagnetic ratios for different nuclei (Hz/T)
const GYROMAGNETIC_RATIOS = {
  'H1': 42.577478518e6, // Hz/T for hydrogen-1
  'C13': 10.7084e6,     // Hz/T for carbon-13
  'N15': 4.3156e6,      // Hz/T for nitrogen-15
  'F19': 40.0776e6,     // Hz/T for fluorine-19
  'P31': 17.235e6       // Hz/T for phosphorus-31
};

function calculateLarmorFrequency(magneticField, nucleus = 'H1') {
  const gamma = GYROMAGNETIC_RATIOS[nucleus];
  if (!gamma) {
    throw new Error(`Unknown nucleus: ${nucleus}`);
  }
  return gamma * magneticField;
}

function formatFrequency(frequency) {
  if (frequency >= 1e9) {
    return `${(frequency / 1e9).toFixed(3)} GHz`;
  } else if (frequency >= 1e6) {
    return `${(frequency / 1e6).toFixed(3)} MHz`;
  } else if (frequency >= 1e3) {
    return `${(frequency / 1e3).toFixed(3)} kHz`;
  } else {
    return `${frequency.toFixed(3)} Hz`;
  }
}

console.log('🧲 Larmor Frequency Calculator Test');
console.log('=====================================\n');

// Test different magnetic field strengths
const testFields = [0.5, 1.0, 1.5, 3.0, 7.0, 9.4]; // Tesla
const testNuclei = ['H1', 'C13', 'N15', 'F19', 'P31'];

console.log('Testing different magnetic field strengths:');
console.log('Field (T) | H1 (MHz) | C13 (MHz) | N15 (MHz) | F19 (MHz) | P31 (MHz)');
console.log('----------|----------|-----------|-----------|-----------|----------');

testFields.forEach(field => {
  const frequencies = testNuclei.map(nucleus => {
    const freq = calculateLarmorFrequency(field, nucleus);
    return (freq / 1e6).toFixed(1);
  });
  
  console.log(`${field.toString().padStart(8)} | ${frequencies[0].padStart(8)} | ${frequencies[1].padStart(9)} | ${frequencies[2].padStart(9)} | ${frequencies[3].padStart(9)} | ${frequencies[4].padStart(9)}`);
});

console.log('\nDetailed calculations for 1.5T field:');
console.log('=====================================');

testNuclei.forEach(nucleus => {
  const frequency = calculateLarmorFrequency(1.5, nucleus);
  const gamma = GYROMAGNETIC_RATIOS[nucleus];
  
  console.log(`\n${nucleus}:`);
  console.log(`  Gyromagnetic ratio: ${(gamma / 1e6).toFixed(3)} MHz/T`);
  console.log(`  Larmor frequency: ${formatFrequency(frequency)}`);
  console.log(`  Calculation: ${(gamma / 1e6).toFixed(3)} MHz/T × 1.5 T = ${(frequency / 1e6).toFixed(3)} MHz`);
});

console.log('\nReal-time simulation test:');
console.log('==========================');

// Simulate real-time data
let magneticField = 1.5;
for (let i = 0; i < 5; i++) {
  // Add small random variation
  const variation = (Math.random() - 0.5) * 0.01; // ±5 mT
  magneticField = Math.max(0.1, 1.5 + variation);
  
  const frequency = calculateLarmorFrequency(magneticField, 'H1');
  
  console.log(`Time ${i + 1}: Field = ${magneticField.toFixed(4)} T, Frequency = ${formatFrequency(frequency)}`);
}

console.log('\n✅ Larmor frequency calculation test completed successfully!');
console.log('\nTo start the real-time web interface:');
console.log('1. Run: npm start');
console.log('2. Open: http://localhost:3000');
console.log('3. Use the chat interface to interact with the system');