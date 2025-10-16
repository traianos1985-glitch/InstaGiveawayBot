const GYRO = [
  { id: 'au197', name: 'Χρυσός 197Au (πυρήνας)', gammaHzPerT: 0.327e6 },
  { id: 'ag107', name: 'Άργυρος 107Ag (πυρήνας)', gammaHzPerT: 1.088e6, sign: -1 },
  { id: 'ag109', name: 'Άργυρος 109Ag (πυρήνας)', gammaHzPerT: 1.251e6, sign: -1 },
  { id: 'cu63', name: 'Χαλκός 63Cu (πυρήνας)', gammaHzPerT: 11.285e6 },
  { id: 'cu65', name: 'Χαλκός 65Cu (πυρήνας)', gammaHzPerT: 12.089e6 },
  { id: 'al27', name: 'Αλουμίνιο 27Al (πυρήνας)', gammaHzPerT: 11.094e6 },
  { id: 'fe57', name: 'Σίδηρος 57Fe (πυρήνας, ενδεικτικό για κιβώτια 1940)', gammaHzPerT: 1.375e6 }
];

const el = (id) => document.getElementById(id);

function populateMaterials() {
  const sel = el('material');
  GYRO.forEach((g) => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.name} — ${(g.gammaHzPerT / 1e6).toFixed(3)} MHz/T`;
    sel.appendChild(opt);
  });
}

function renderGammaTable() {
  const div = document.getElementById('gammaTable');
  const rows = GYRO.map(g => `<tr><td>${g.name}</td><td>${(g.gammaHzPerT/1e6).toFixed(3)} MHz/T</td></tr>`).join('');
  div.innerHTML = `<table><thead><tr><th>Υλικό</th><th>γ/2π</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadPlaces() {
  const r = await fetch('/api/places');
  const data = await r.json();
  const sel = el('place');
  data.places.forEach(p => {
    const opt = document.createElement('option');
    opt.value = `${p.lat},${p.lon}`;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function getSelectedGamma() {
  const id = el('material').value;
  const item = GYRO.find(g => g.id === id) || GYRO[0];
  return Math.abs(item.gammaHzPerT);
}

function getBInTesla() {
  const val = parseFloat(el('bValue').value);
  const units = el('bUnits').value;
  if (!Number.isFinite(val)) return NaN;
  return units === 'T' ? val : val * 1e-6;
}

function setBFromTesla(B, providerLabel) {
  el('bUnits').value = 'uT';
  el('bValue').value = (B * 1e6).toFixed(2);
  el('providerInfo').textContent = providerLabel || '';
}

async function fetchField(lat, lon) {
  const source = el('source').value;
  const dateIso = new Date().toISOString();

  async function get(provider) {
    const url = provider === 'noaa'
      ? `/api/field/noaa?lat=${lat}&lon=${lon}&date=${encodeURIComponent(dateIso)}`
      : `/api/field/bgs?lat=${lat}&lon=${lon}&date=${encodeURIComponent(dateIso)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  if (source === 'avg') {
    const [a, b] = await Promise.allSettled([get('noaa'), get('bgs')]);
    const vals = [];
    if (a.status === 'fulfilled') vals.push(a.value.totalIntensityT);
    if (b.status === 'fulfilled') vals.push(b.value.totalIntensityT);
    if (vals.length === 0) throw new Error('Καμία τιμή διαθέσιμη από NOAA/BGS');
    const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
    const label = `B = ${(mean*1e6).toFixed(2)} μT (μέσος όρος${vals.length===1? ' — 1 πηγή' : ''})`;
    return { B: mean, label };
  }

  const data = await get(source);
  const label = `B = ${(data.totalIntensityT*1e6).toFixed(2)} μT (${data.provider})`;
  return { B: data.totalIntensityT, label };
}

function computeHarmonics(fHz) {
  const f = Math.abs(fHz);
  if (!Number.isFinite(f) || f <= 0) return [];
  const low = 9e6, high = 50e6;
  const nMin = Math.ceil(low / f);
  const nMax = Math.floor(high / f);
  const limit = 1000;
  const out = [];
  for (let n = nMin; n <= nMax && out.length < limit; n++) {
    out.push({ n, fHz: n * f });
  }
  return out;
}

function renderHarmonics(list) {
  if (list.length === 0) {
    el('harmonics').innerHTML = '<p class="muted">Καμία αρμονική στο εύρος 9–50 MHz.</p>';
    return;
  }
  const rows = list.map(h => `<tr><td>${h.n}</td><td>${(h.fHz/1e6).toFixed(3)} MHz</td></tr>`).join('');
  el('harmonics').innerHTML = `<table><thead><tr><th>n</th><th>Συχνότητα</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderResult(B, gammaHzPerT) {
  const fHz = Math.abs(gammaHzPerT) * B;
  const html = `
    <p><strong>f<sub>L</sub></strong> = ${fHz.toFixed(2)} Hz (${(fHz/1e6).toFixed(6)} MHz)</p>
  `;
  el('result').innerHTML = html;
  renderHarmonics(computeHarmonics(fHz));
}

function bindUI() {
  el('btnFetchPlace').addEventListener('click', async () => {
    try {
      const [lat, lon] = el('place').value.split(',').map(parseFloat);
      const { B, label } = await fetchField(lat, lon);
      setBFromTesla(B, label);
    } catch (e) {
      alert('Σφάλμα λήψης πεδίου: ' + e.message);
    }
  });

  el('btnGeolocate').addEventListener('click', () => {
    const status = el('geoStatus');
    status.textContent = 'Λήψη τοποθεσίας…';
    if (!navigator.geolocation) {
      status.textContent = 'Ο browser δεν υποστηρίζει γεωεντοπισμό.';
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const { B, label } = await fetchField(latitude, longitude);
        setBFromTesla(B, label + ` @ ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        status.textContent = 'Έτοιμο.';
      } catch (e) {
        status.textContent = 'Σφάλμα λήψης πεδίου.';
      }
    }, (err) => {
      status.textContent = 'Σφάλμα γεωεντοπισμού.';
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  el('btnCalc').addEventListener('click', () => {
    const B = getBInTesla();
    if (!Number.isFinite(B) || B <= 0) {
      alert('Δώστε έγκυρη τιμή B.');
      return;
    }
    const gamma = getSelectedGamma();
    renderResult(B, gamma);
  });
}

function init() {
  populateMaterials();
  renderGammaTable();
  loadPlaces();
  bindUI();
}

init();
