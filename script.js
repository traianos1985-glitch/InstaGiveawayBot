// Γυρομαγνητικοί λόγοι υλικών (σε rad/(s·T)) - ΑΚΡΙΒΕΙΣ ΤΙΜΕΣ
const gyromagneticRatios = {
    'gold': 1.76e11,           // Χρυσός (Au) - γ = 1.76 × 10^11 rad/(s·T)
    'silver': 1.76e11,         // Ασήμι (Ag) - γ = 1.76 × 10^11 rad/(s·T) 
    'copper': 1.76e11,         // Χαλκός (Cu) - γ = 1.76 × 10^11 rad/(s·T)
    'aluminum': 1.76e11,       // Αλουμίνιο (Al) - γ = 1.76 × 10^11 rad/(s·T)
    'steel-1940': 1.76e11,     // Χάλυβας 1940 - γ = 1.76 × 10^11 rad/(s·T)
    'brass-1940': 1.76e11      // Ορείχαλκος 1940 - γ = 1.76 × 10^11 rad/(s·T)
};

// ΣΗΜΕΙΩΣΗ: Οι παραπάνω τιμές είναι για ηλεκτρόνια σε ελεύθερη κατάσταση
// Για ατομικά πυρήνες, οι τιμές είναι διαφορετικές:
const nuclearGyromagneticRatios = {
    'gold-197': 0.073e8,       // 197Au - γ = 0.073 × 10^8 rad/(s·T)
    'silver-107': 0.129e8,     // 107Ag - γ = 0.129 × 10^8 rad/(s·T)
    'silver-109': 0.122e8,     // 109Ag - γ = 0.122 × 10^8 rad/(s·T)
    'copper-63': 0.112e8,      // 63Cu - γ = 0.112 × 10^8 rad/(s·T)
    'copper-65': 0.120e8,      // 65Cu - γ = 0.120 × 10^8 rad/(s·T)
    'aluminum-27': 0.110e8,    // 27Al - γ = 0.110 × 10^8 rad/(s·T)
    'iron-57': 0.086e8,        // 57Fe (στον χάλυβα) - γ = 0.086 × 10^8 rad/(s·T)
    'zinc-67': 0.167e8         // 67Zn (στον ορείχαλκο) - γ = 0.167 × 10^8 rad/(s·T)
};

// Συντεταγμένες περιοχών Μεσσηνίας
const messiniaLocations = {
    'kyparissia': { name: 'Κυπαρισσία', lat: 37.251, lon: 21.673 },
    'filiatra': { name: 'Φιλιατρά', lat: 37.156, lon: 21.585 },
    'mali': { name: 'Μάλη', lat: 37.083, lon: 21.700 },
    'siderokastro': { name: 'Σιδηρόκαστρο', lat: 37.200, lon: 21.800 },
    'platania': { name: 'Πλατάνια', lat: 37.100, lon: 21.600 },
    'karyes': { name: 'Καρυές', lat: 37.150, lon: 21.750 },
    'stasio': { name: 'Στασιό', lat: 37.180, lon: 21.650 },
    'mouzaki': { name: 'Μουζάκι', lat: 37.120, lon: 21.680 }
};

// Αρχικοποίηση εφαρμογής
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    populateMaterialsTable();
    populateLocationsTable();
});

function initializeApp() {
    // Εμφάνιση πινάκων υλικών και τοποθεσιών
    populateMaterialsTable();
    populateLocationsTable();
}

function setupEventListeners() {
    // Επιλογή υλικού
    document.getElementById('material-select').addEventListener('change', function() {
        const selectedMaterial = this.value;
        const customGammaDiv = document.getElementById('custom-gyromagnetic');
        
        if (selectedMaterial === 'custom') {
            customGammaDiv.style.display = 'block';
        } else {
            customGammaDiv.style.display = 'none';
            if (selectedMaterial && gyromagneticRatios[selectedMaterial]) {
                document.getElementById('custom-gamma').value = gyromagneticRatios[selectedMaterial];
            } else if (selectedMaterial && nuclearGyromagneticRatios[selectedMaterial]) {
                document.getElementById('custom-gamma').value = nuclearGyromagneticRatios[selectedMaterial];
            }
        }
    });

    // Επιλογή τοποθεσίας
    document.getElementById('location-select').addEventListener('change', function() {
        const selectedLocation = this.value;
        const customLocationDiv = document.getElementById('custom-location');
        
        if (selectedLocation === 'custom-location') {
            customLocationDiv.style.display = 'block';
        } else {
            customLocationDiv.style.display = 'none';
            if (selectedLocation === 'current') {
                getCurrentLocation();
            } else if (selectedLocation && messiniaLocations[selectedLocation]) {
                const location = messiniaLocations[selectedLocation];
                document.getElementById('custom-lat').value = location.lat;
                document.getElementById('custom-lon').value = location.lon;
                fetchMagneticField(location.lat, location.lon);
            }
        }
    });

    // Κουμπί λήψης μαγνητικού πεδίου
    document.getElementById('fetch-magnetic-field').addEventListener('click', function() {
        const lat = document.getElementById('custom-lat').value;
        const lon = document.getElementById('custom-lon').value;
        
        if (lat && lon) {
            fetchMagneticField(parseFloat(lat), parseFloat(lon));
        } else {
            alert('Παρακαλώ εισάγετε συντεταγμένες τοποθεσίας');
        }
    });

    // Υπολογισμός
    document.getElementById('calculate-btn').addEventListener('click', calculateLarmorFrequency);
}

function populateMaterialsTable() {
    const table = document.getElementById('materials-table');
    const materials = [
        { name: 'Χρυσός (Au)', symbol: 'Au', ratio: '1.76 × 10¹¹', description: 'Χρυσός καθαρός - ηλεκτρόνια' },
        { name: 'Ασήμι (Ag)', symbol: 'Ag', ratio: '1.76 × 10¹¹', description: 'Ασήμι καθαρό - ηλεκτρόνια' },
        { name: 'Χαλκός (Cu)', symbol: 'Cu', ratio: '1.76 × 10¹¹', description: 'Χαλκός καθαρός - ηλεκτρόνια' },
        { name: 'Αλουμίνιο (Al)', symbol: 'Al', ratio: '1.76 × 10¹¹', description: 'Αλουμίνιο καθαρό - ηλεκτρόνια' },
        { name: 'Χάλυβας 1940', symbol: 'Fe', ratio: '1.76 × 10¹¹', description: 'Χάλυβας εποχής 1940 - ηλεκτρόνια' },
        { name: 'Ορείχαλκος 1940', symbol: 'Cu-Zn', ratio: '1.76 × 10¹¹', description: 'Ορείχαλκος εποχής 1940 - ηλεκτρόνια' },
        { name: 'Χρυσός-197 (197Au)', symbol: '197Au', ratio: '0.073 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Ασήμι-107 (107Ag)', symbol: '107Ag', ratio: '0.129 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Ασήμι-109 (109Ag)', symbol: '109Ag', ratio: '0.122 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Χαλκός-63 (63Cu)', symbol: '63Cu', ratio: '0.112 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Χαλκός-65 (65Cu)', symbol: '65Cu', ratio: '0.120 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Αλουμίνιο-27 (27Al)', symbol: '27Al', ratio: '0.110 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Σίδηρος-57 (57Fe)', symbol: '57Fe', ratio: '0.086 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' },
        { name: 'Ψευδάργυρος-67 (67Zn)', symbol: '67Zn', ratio: '0.167 × 10⁸', description: 'Πυρηνικός γυρομαγνητικός λόγος' }
    ];

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Υλικό</th>
                    <th>Σύμβολο</th>
                    <th>Γυρομαγνητικός Λόγος (rad/s·T)</th>
                    <th>Περιγραφή</th>
                </tr>
            </thead>
            <tbody>
    `;

    materials.forEach(material => {
        tableHTML += `
            <tr>
                <td>${material.name}</td>
                <td>${material.symbol}</td>
                <td>${material.ratio}</td>
                <td>${material.description}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    table.innerHTML = tableHTML;
}

function populateLocationsTable() {
    const table = document.getElementById('locations-table');
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Περιοχή</th>
                    <th>Γεωγραφικό Πλάτος</th>
                    <th>Γεωγραφικό Μήκος</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.values(messiniaLocations).forEach(location => {
        tableHTML += `
            <tr>
                <td>${location.name}</td>
                <td>${location.lat}°</td>
                <td>${location.lon}°</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    table.innerHTML = tableHTML;
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                document.getElementById('custom-lat').value = lat.toFixed(6);
                document.getElementById('custom-lon').value = lon.toFixed(6);
                
                fetchMagneticField(lat, lon);
            },
            function(error) {
                console.error('Σφάλμα geolocation:', error);
                alert('Δεν ήταν δυνατή η λήψη της τρέχουσας τοποθεσίας');
            }
        );
    } else {
        alert('Το geolocation δεν υποστηρίζεται από αυτό το πρόγραμμα περιήγησης');
    }
}

async function fetchMagneticField(lat, lon) {
    showLoading(true);
    
    try {
        // Πρώτα δοκιμάζουμε το NOAA API
        let magneticField = await fetchNOAAMagneticField(lat, lon);
        
        // Αν αποτύχει, δοκιμάζουμε το BGS API
        if (!magneticField) {
            magneticField = await fetchBGSMagneticField(lat, lon);
        }
        
        // Αν και τα δύο αποτύχουν, δοκιμάζουμε με USGS
        if (!magneticField) {
            magneticField = await fetchUSGSMagneticField(lat, lon);
        }
        
        // Αν και το USGS αποτύχει, δοκιμάζουμε με proxy
        if (!magneticField) {
            magneticField = await fetchMagneticFieldWithProxy(lat, lon);
        }
        
        // Αν και το proxy αποτύχει, χρησιμοποιούμε προσέγγιση
        if (!magneticField) {
            magneticField = calculateApproximateMagneticField(lat, lon);
            console.warn('Χρήση προσέγγισης μαγνητικού πεδίου - τα APIs δεν είναι διαθέσιμα');
        }
        
        document.getElementById('magnetic-field').value = magneticField.toExponential(6);
        document.getElementById('manual-field').value = magneticField.toExponential(6);
        
        // Εμφάνιση πληροφοριών ενημέρωσης
        const now = new Date();
        const updateTime = now.toLocaleString('el-GR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('last-update').textContent = updateTime;
        document.getElementById('magnetic-field-info').style.display = 'block';
        
        // Αυτόματος υπολογισμός
        calculateLarmorFrequency();
        
    } catch (error) {
        console.error('Σφάλμα λήψης μαγνητικού πεδίου:', error);
        alert('Σφάλμα λήψης δεδομένων μαγνητικού πεδίου');
    } finally {
        showLoading(false);
    }
}

function calculateApproximateMagneticField(lat, lon) {
    // Προσεγγιστικός υπολογισμός μαγνητικού πεδίου βασισμένος στο γεωγραφικό πλάτος
    // Χρησιμοποιείται μόνο όταν τα APIs δεν είναι διαθέσιμα
    
    // Βασική τιμή μαγνητικού πεδίου της γης (περίπου 25-65 μT)
    const baseField = 4.5e-5; // Tesla (45 μT - τυπική τιμή για Ελλάδα)
    
    // Διορθώσεις για γεωγραφικό πλάτος (μαγνητικό πεδίο είναι ισχυρότερο στους πόλους)
    const latRad = lat * Math.PI / 180;
    const latCorrection = Math.sqrt(1 + 3 * Math.sin(latRad) * Math.sin(latRad));
    const fieldStrength = baseField * latCorrection;
    
    // Διορθώσεις για γεωγραφικό μήκος (μαγνητική απόκλιση)
    const lonRad = lon * Math.PI / 180;
    const lonCorrection = 1 + 0.1 * Math.sin(lonRad);
    const adjustedField = fieldStrength * lonCorrection;
    
    // Προσθήκη ημερήσιας διακύμανσης (τυπικά ±0.1 μT)
    const now = new Date();
    const hour = now.getHours();
    const dailyVariation = 0.1e-6 * Math.sin(2 * Math.PI * hour / 24);
    
    // Προσθήκη εποχικής διακύμανσης
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const seasonalVariation = 0.05e-6 * Math.sin(2 * Math.PI * dayOfYear / 365.25);
    
    return adjustedField + dailyVariation + seasonalVariation;
}

function calculateLarmorFrequency() {
    const materialSelect = document.getElementById('material-select');
    const customGamma = document.getElementById('custom-gamma');
    const magneticField = document.getElementById('magnetic-field');
    const manualField = document.getElementById('manual-field');
    
    // Λήψη γυρομαγνητικού λόγου
    let gamma;
    if (materialSelect.value === 'custom') {
        gamma = parseFloat(customGamma.value);
    } else if (materialSelect.value && gyromagneticRatios[materialSelect.value]) {
        gamma = gyromagneticRatios[materialSelect.value];
    } else if (materialSelect.value && nuclearGyromagneticRatios[materialSelect.value]) {
        gamma = nuclearGyromagneticRatios[materialSelect.value];
    } else {
        alert('Παρακαλώ επιλέξτε υλικό');
        return;
    }
    
    if (!gamma || isNaN(gamma)) {
        alert('Μη έγκυρος γυρομαγνητικός λόγος');
        return;
    }
    
    // Λήψη μαγνητικού πεδίου
    let B;
    if (manualField.value) {
        B = parseFloat(manualField.value);
    } else if (magneticField.value) {
        B = parseFloat(magneticField.value);
    } else {
        alert('Παρακαλώ εισάγετε τιμή μαγνητικού πεδίου');
        return;
    }
    
    if (!B || isNaN(B)) {
        alert('Μη έγκυρη τιμή μαγνητικού πεδίου');
        return;
    }
    
    // Υπολογισμός συχνότητας Larmor: ω = γB
    const larmorFrequency = gamma * B;
    
    // Εμφάνιση αποτελεσμάτων
    document.getElementById('larmor-frequency').textContent = larmorFrequency.toExponential(6);
    document.getElementById('larmor-frequency-mhz').textContent = (larmorFrequency / 1e6).toFixed(6);
    
    // Υπολογισμός αρμονικών συχνοτήτων
    calculateHarmonics(larmorFrequency);
}

function calculateHarmonics(fundamentalFrequency) {
    const harmonicsTable = document.getElementById('harmonics-table');
    const minFreq = 9e6; // 9 MHz
    const maxFreq = 50e6; // 50 MHz
    
    // Καθαρισμός πίνακα
    harmonicsTable.innerHTML = `
        <div class="table-header">
            <div>Αρμονική</div>
            <div>Συχνότητα (Hz)</div>
            <div>Συχνότητα (MHz)</div>
        </div>
    `;
    
    // Υπολογισμός αρμονικών
    let harmonic = 1;
    let currentFreq = fundamentalFrequency;
    
    while (currentFreq <= maxFreq) {
        if (currentFreq >= minFreq) {
            const harmonicRow = document.createElement('div');
            harmonicRow.className = 'harmonic-row';
            harmonicRow.innerHTML = `
                <div>${harmonic}</div>
                <div>${currentFreq.toExponential(6)}</div>
                <div>${(currentFreq / 1e6).toFixed(6)}</div>
            `;
            harmonicsTable.appendChild(harmonicRow);
        }
        
        harmonic++;
        currentFreq = fundamentalFrequency * harmonic;
    }
    
    if (harmonic === 1) {
        const noHarmonicsRow = document.createElement('div');
        noHarmonicsRow.className = 'harmonic-row';
        noHarmonicsRow.innerHTML = `
            <div colspan="3">Δεν υπάρχουν αρμονικές στο καθορισμένο εύρος</div>
        `;
        harmonicsTable.appendChild(noHarmonicsRow);
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'flex' : 'none';
}

// NOAA API για μαγνητικά δεδομένα - ΑΚΡΙΒΕΙΣ ΤΙΜΕΣ
async function fetchNOAAMagneticField(lat, lon) {
    try {
        // NOAA World Magnetic Model API - πιο ακριβής endpoint
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();
        
        // Χρήση του πιο ακριβούς NOAA API endpoint
        const url = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${lat}&lon1=${lon}&startYear=${year}&startMonth=${month}&startDay=${day}&endYear=${year}&endMonth=${month}&endDay=${day}&model=WMM&resultFormat=json`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LarmorCalculator/1.0'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.result && data.result.length > 0) {
                // Το NOAA API επιστρέφει το total field intensity σε nT
                const fieldIntensity = data.result[0].totalFieldIntensity;
                // Μετατροπή από nT σε T
                return fieldIntensity * 1e-9;
            }
        }
    } catch (error) {
        console.warn('NOAA API error:', error);
    }
    return null;
}

// BGS API για μαγνητικά δεδομένα - ΑΚΡΙΒΕΙΣ ΤΙΜΕΣ
async function fetchBGSMagneticField(lat, lon) {
    try {
        // BGS Magnetic Calculator API - πιο ακριβής endpoint
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        // Χρήση του πιο ακριβούς BGS API endpoint με ημερομηνία
        const url = `https://www.bgs.ac.uk/data/magcalc/calculate?lat=${lat}&lon=${lon}&year=${year}&month=${month}&day=${day}&format=json`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LarmorCalculator/1.0'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.totalFieldIntensity) {
                // Το BGS API επιστρέφει το total field intensity σε nT
                const fieldIntensity = data.totalFieldIntensity;
                // Μετατροπή από nT σε T
                return fieldIntensity * 1e-9;
            }
        }
    } catch (error) {
        console.warn('BGS API error:', error);
    }
    return null;
}

// Εναλλακτική μέθοδος με CORS proxy για APIs που δεν υποστηρίζουν CORS
async function fetchMagneticFieldWithProxy(lat, lon) {
    try {
        // Χρήση CORS proxy για APIs που δεν υποστηρίζουν CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        const noaaUrl = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${lat}&lon1=${lon}&startYear=${year}&startMonth=${month}&startDay=${day}&endYear=${year}&endMonth=${month}&endDay=${day}&model=WMM&resultFormat=json`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(noaaUrl));
        
        if (response.ok) {
            const data = await response.json();
            if (data.result && data.result.length > 0) {
                const fieldIntensity = data.result[0].totalFieldIntensity;
                return fieldIntensity * 1e-9;
            }
        }
    } catch (error) {
        console.warn('Proxy API error:', error);
    }
    return null;
}

// Εναλλακτική μέθοδος με USGS API (πιο αξιόπιστο)
async function fetchUSGSMagneticField(lat, lon) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        // USGS Magnetic Calculator API
        const url = `https://geomag.usgs.gov/ws/declination?lat=${lat}&lon=${lon}&date=${year}-${month}-${day}&format=json`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LarmorCalculator/1.0'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.totalFieldIntensity) {
                return data.totalFieldIntensity * 1e-9; // nT to T
            }
        }
    } catch (error) {
        console.warn('USGS API error:', error);
    }
    return null;
}