const GYRO = [
  // τιμές γ/2π σε Hz/T (προεπιλεγμένες αναφορές)
  { id: 'au197', name: 'Χρυσός 197Au (πυρήνας)', gammaHzPerT: 0.327e6 },
  { id: 'ag107', name: 'Άργυρος 107Ag (πυρήνας)', gammaHzPerT: 1.088e6 },
  { id: 'ag109', name: 'Άργυρος 109Ag (πυρήνας)', gammaHzPerT: 1.251e6 },
  { id: 'cu63', name: 'Χαλκός 63Cu (πυρήνας)', gammaHzPerT: 11.285e6 },
  { id: 'cu65', name: 'Χαλκός 65Cu (πυρήνας)', gammaHzPerT: 12.0899e6 },
  { id: 'al27', name: 'Αλουμίνιο 27Al (πυρήνας)', gammaHzPerT: 11.094266e6 },
  { id: 'fe57', name: 'Σίδηρος 57Fe (πυρήνας, ενδεικτικό για κιβώτια 1940)', gammaHzPerT: 1.3758e6 }
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
  const rows = GYRO.map(g => `<tr><td>${g.name}</td><td>${(g.gammaHzPerT/1e6).toFixed(6)} MHz/T</td></tr>`).join('');
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

function getGammaFromOverride() {
  const useOverride = el('gammaOverrideChk').checked;
  if (!useOverride) return null;
  const val = parseFloat(el('gammaOverride').value);
  if (!Number.isFinite(val) || val <= 0) return null;
  const units = el('gammaUnits').value;
  return units === 'MHz/T' ? val * 1e6 : val; // return Hz/T
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
  const dtVal = el('dt').value;
  const dateIso = dtVal ? new Date(dtVal).toISOString() : new Date().toISOString();
  const altMetersRaw = parseFloat(el('altitude').value);
  const altMeters = Number.isFinite(altMetersRaw) ? altMetersRaw : 0;

  async function get(provider) {
    const url = provider === 'noaa'
      ? `/api/field/noaa?lat=${lat}&lon=${lon}&alt=${altMeters}&date=${encodeURIComponent(dateIso)}`
      : `/api/field/bgs?lat=${lat}&lon=${lon}&alt=${altMeters}&date=${encodeURIComponent(dateIso)}`;
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
    const label = `B = ${(mean*1e6).toFixed(2)} μT (μέσος όρος${vals.length===1? ' — 1 πηγή' : ''}) @ t=${dateIso} φ=${lat.toFixed(4)} λ=${lon.toFixed(4)} h=${altMeters}m`;
    const decl = [a, b].map(x => x.status === 'fulfilled' ? x.value.declinationDeg : undefined).filter(v => typeof v === 'number');
    const declMean = decl.length ? decl.reduce((s, x) => s + x, 0) / decl.length : undefined;
    return { B: mean, label, declinationDeg: declMean };
  }

  const data = await get(source);
  const label = `B = ${(data.totalIntensityT*1e6).toFixed(2)} μT (${data.provider}) @ t=${data.date || dateIso} φ=${lat.toFixed(4)} λ=${lon.toFixed(4)} h=${altMeters}m`;
  return { B: data.totalIntensityT, label, declinationDeg: data.declinationDeg };
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

function unitToHz(value, unit) {
  if (!Number.isFinite(value)) return NaN;
  if (unit === 'Hz') return value;
  if (unit === 'kHz') return value * 1e3;
  if (unit === 'MHz') return value * 1e6;
  return value;
}

function computeSkinDepthMeters(freqHz, sigma, muRel = 1) {
  const mu0 = 4 * Math.PI * 1e-7; // H/m
  const mu = muRel * mu0;
  const omega = 2 * Math.PI * freqHz;
  if (!(freqHz > 0) || !(sigma > 0)) return NaN;
  return Math.sqrt(2 / (omega * mu * sigma));
}

function estimateSearchRadius(freqHz, sigma, depthM, coinCount, coinDiameterMm, threshold = 0.3, burialYears = 80) {
  const delta = computeSkinDepthMeters(freqHz, sigma);
  if (!Number.isFinite(delta)) return { delta, radius: NaN, attenuation: NaN };
  // Attenuation factor at depth z: exp(-z/delta)
  const attenuation = Math.exp(-depthM / delta);
  // Target size proxy ~ area * count
  const radiusCoin = (coinDiameterMm / 1000) / 2;
  const targetArea = Math.PI * radiusCoin * radiusCoin * coinCount;
  // Heuristic: detectable radius on surface ~ k * delta * attenuation^(p) * (targetArea)^(1/3)
  const k = 1.0; // scaling constant (heuristic)
  const p = 0.5; // non-linear perception factor
  let radius = k * delta * Math.pow(attenuation, p) * Math.cbrt(targetArea + 1e-9);
  // Apply threshold (lower threshold -> larger radius)
  radius = radius * (1 / Math.max(threshold, 1e-3));
  // Buried years factor: soil compaction/corrosion/aging effects (heuristic 0.9–1.1)
  const aging = Math.min(1.1, Math.max(0.9, 1 - (burialYears - 80) * 0.001));
  radius *= aging;
  return { delta, radius, attenuation };
}

function bindGeophysicsUI() {
  el('btnGeoCalc').addEventListener('click', () => {
    const fVal = parseFloat(el('genFreq').value);
    const fUnit = el('genFreqUnits').value;
    const freqHz = unitToHz(fVal, fUnit);
    const sigma = parseFloat(el('soilSigma').value);
    const depthM = parseFloat(el('targetDepth').value);
    const coinCount = Math.max(1, Math.floor(parseFloat(el('coinCount').value) || 1));
    const coinDiameterMm = parseFloat(el('coinDiameter').value);
    const threshold = parseFloat(el('threshold').value);
    const burialYears = Math.max(0, Math.floor(parseFloat(el('burialYears').value || '80')));

    if (!(freqHz > 0) || !(sigma > 0) || !(depthM >= 0) || !(coinDiameterMm > 0)) {
      alert('Ελέγξτε τιμές: συχνότητα, αγωγιμότητα, βάθος, διάμετρος νομίσματος.');
      return;
    }

    const { delta, radius, attenuation } = estimateSearchRadius(
      freqHz, sigma, depthM, coinCount, coinDiameterMm, threshold, burialYears
    );

    const r = Number.isFinite(radius) ? radius : NaN;
    const circumference = Number.isFinite(r) ? 2 * Math.PI * r : NaN;
    const area = Number.isFinite(r) ? Math.PI * r * r : NaN;
    const html = `
      <p>Βάθος διείσδυσης δ ≈ <strong>${delta.toFixed(3)}</strong> m</p>
      <p>Εξασθένηση στο βάθος z: <strong>${attenuation.toFixed(3)}</strong></p>
      <p>Προτεινόμενη ζώνη (κύκλος γύρω από το σημείο):</p>
      <ul>
        <li>Ακτίνα: <strong>${Number.isFinite(r) ? r.toFixed(2) : '—'} m</strong></li>
        <li>Περίμετρος: <strong>${Number.isFinite(circumference) ? circumference.toFixed(2) : '—'} m</strong></li>
        <li>Εμβαδό: <strong>${Number.isFinite(area) ? area.toFixed(1) : '—'} m²</strong></li>
      </ul>
      <p class="muted small">Λαμβάνεται υπόψη ευρετικό «aging» για ${burialYears} έτη ταφής.</p>
    `;
    el('geoOutputs').innerHTML = html;
  });
}

function bindUI() {
  el('btnFetchPlace').addEventListener('click', async () => {
    try {
      const [lat, lon] = el('place').value.split(',').map(parseFloat);
      const { B, label, declinationDeg } = await fetchField(lat, lon);
      setBFromTesla(B, label);
      document.getElementById('declInfo').textContent = (typeof declinationDeg === 'number') ? `Τοπική απόκλιση: ${(declinationDeg).toFixed(2)}°` : '';
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
        const { B, label, declinationDeg } = await fetchField(latitude, longitude);
        setBFromTesla(B, label + ` @ ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        status.textContent = 'Έτοιμο.';
        document.getElementById('declInfo').textContent = (typeof declinationDeg === 'number') ? `Τοπική απόκλιση: ${(declinationDeg).toFixed(2)}°` : '';
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
    const override = getGammaFromOverride();
    const gamma = override ?? getSelectedGamma();
    renderResult(B, gamma);
  });
}

function init() {
  populateMaterials();
  renderGammaTable();
  loadPlaces();
  bindUI();
  bindGeophysicsUI();
  initSurvey();
}

init();
