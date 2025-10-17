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
  const modeSel = document.getElementById('targetMode');
  const coinsRow1 = document.getElementById('coinsRow1');
  const coinsRow2 = document.getElementById('coinsRow2');
  const massRow1 = document.getElementById('massRow1');
  const massRow2 = document.getElementById('massRow2');
  const massRow3 = document.getElementById('massRow3');
  function updateMode() {
    const m = modeSel.value;
    const isMass = m === 'mass';
    coinsRow1.style.display = isMass ? 'none' : '';
    coinsRow2.style.display = isMass ? 'none' : '';
    massRow1.style.display = isMass ? '' : 'none';
    massRow2.style.display = isMass ? '' : 'none';
    massRow3.style.display = isMass ? '' : 'none';
  }
  modeSel.addEventListener('change', updateMode);
  updateMode();

  el('btnGeoCalc').addEventListener('click', () => {
    const fVal = parseFloat(el('genFreq').value);
    const fUnit = el('genFreqUnits').value;
    const freqHz = unitToHz(fVal, fUnit);
    const sigma = parseFloat(el('soilSigma').value);
    const depthM = parseFloat(el('targetDepth').value);
    const mode = modeSel.value;
    let coinCount = 1;
    let coinDiameterMm = 22.05;
    if (mode === 'coins') {
      coinCount = Math.max(1, Math.floor(parseFloat(el('coinCount').value) || 1));
      coinDiameterMm = parseFloat(el('coinDiameter').value);
      const ammo = document.getElementById('ammoBoxChk').checked;
      if (ammo) {
        const capacity = Math.max(1, Math.floor(parseFloat(document.getElementById('boxCapacity').value) || 3000));
        // assume packs of full boxes if count > capacity
        const boxes = Math.max(1, Math.ceil(coinCount / capacity));
        // top area per box (m^2)
        const L = parseFloat(document.getElementById('boxTopLcm').value) / 100; // cm -> m
        const W = parseFloat(document.getElementById('boxTopWcm').value) / 100;
        const areaPerBox = (Number.isFinite(L) && Number.isFinite(W) && L>0 && W>0) ? (L * W) : 0.09; // default 0.3x0.3
        // Replace coin proxy by equivalent area of stacked metal lids (larger coupling)
        // Map area -> equivalent coin count
        const rCoin = (coinDiameterMm / 1000) / 2;
        const areaCoin = Math.PI * rCoin * rCoin;
        const totalArea = boxes * areaPerBox;
        coinCount = areaCoin > 0 ? Math.max(1, Math.round(totalArea / areaCoin)) : coinCount;
      }
    } else {
      const massKg = parseFloat(document.getElementById('massKg').value);
      const rho_g_cm3 = parseFloat(document.getElementById('density').value);
      const shape = document.getElementById('shape').value;
      const thicknessMm = parseFloat(document.getElementById('thickness').value);
      // Convert mass and density to volume (m^3): V = m / rho
      const rho = rho_g_cm3 * 1000; // g/cm3 -> kg/m3 (1 g/cm3 = 1000 kg/m3)
      const V = (massKg > 0 && rho > 0) ? (massKg / rho) : NaN;
      let areaM2 = NaN;
      if (shape === 'sphere') {
        // sphere: V = 4/3 π r^3 => r = (3V/4π)^(1/3), effective area proxy use π r^2
        const r = Math.cbrt((3 * V) / (4 * Math.PI));
        areaM2 = Math.PI * r * r;
      } else {
        // disc: V = A * t => A = V / t
        const t = (thicknessMm > 0) ? (thicknessMm / 1000) : NaN; // m
        areaM2 = (Number.isFinite(V) && Number.isFinite(t) && t > 0) ? (V / t) : NaN;
      }
      // Map area to equivalent coin count/diameter proxy so we can reuse estimation
      // Choose default coin diameter (22.05 mm) and compute equivalent count
      coinDiameterMm = 22.05;
      const rCoin = (coinDiameterMm / 1000) / 2;
      const areaCoin = Math.PI * rCoin * rCoin;
      coinCount = Number.isFinite(areaM2) && areaCoin > 0 ? Math.max(1, Math.round(areaM2 / areaCoin)) : 1;
    }
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

// -------- Survey mode (bearings -> target estimate) --------
function initSurvey() {
  const survey = {
    points: [], // {lat, lon, bearingMagDeg, declinationDeg, bearingTrueDeg, distanceM}
    lastGPS: null,
  };

  // Map init
  let map = null; let markers = []; let targetMarker = null;
  function ensureMap() {
    if (map) return map;
    map = L.map('map');
    // Try geolocation to center map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos)=>{
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },()=>{ map.setView([37.245, 21.67], 11); });
    } else {
      map.setView([37.245, 21.67], 11);
    }
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.on('click', async (e) => {
      // On map click, use it as lastGPS and optional quick add if bearing given
      survey.lastGPS = { lat: e.latlng.lat, lon: e.latlng.lng };
      addMarker(e.latlng.lat, e.latlng.lng, 'Σημείο');
    });
    return map;
  }
  ensureMap();

  function addMarker(lat, lon, label) {
    const m = L.marker([lat, lon], { title: label });
    m.addTo(map).bindPopup(label);
    markers.push(m);
  }

  async function getDeclinationAt(lat, lon) {
    // Use both providers and average
    const dtVal = document.getElementById('dt').value;
    const dateIso = dtVal ? new Date(dtVal).toISOString() : new Date().toISOString();
    const altMetersRaw = parseFloat(document.getElementById('altitude').value);
    const altMeters = Number.isFinite(altMetersRaw) ? altMetersRaw : 0;
    async function get(provider) {
      const url = provider === 'noaa'
        ? `/api/field/noaa?lat=${lat}&lon=${lon}&alt=${altMeters}&date=${encodeURIComponent(dateIso)}`
        : `/api/field/bgs?lat=${lat}&lon=${lon}&alt=${altMeters}&date=${encodeURIComponent(dateIso)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }
    const [a, b] = await Promise.allSettled([get('noaa'), get('bgs')]);
    const vals = [];
    if (a.status === 'fulfilled' && typeof a.value.declinationDeg === 'number') vals.push(a.value.declinationDeg);
    if (b.status === 'fulfilled' && typeof b.value.declinationDeg === 'number') vals.push(b.value.declinationDeg);
    const mean = vals.length ? (vals.reduce((s, x) => s + x, 0) / vals.length) : undefined;
    return mean;
  }

  function llToXY(lat, lon, lat0, lon0) {
    const R = 6371000; // meters
    const toRad = Math.PI / 180;
    const x = (lon - lon0) * toRad * Math.cos(lat0 * toRad) * R;
    const y = (lat - lat0) * toRad * R;
    return { x, y };
  }

  function xyToLL(x, y, lat0, lon0) {
    const R = 6371000;
    const toDeg = 180 / Math.PI;
    const lat = y / R * toDeg + lat0;
    const lon = x / (R * Math.cos(lat0 * Math.PI / 180)) * toDeg + lon0;
    return { lat, lon };
  }

  function normalizeDeg(a) {
    let d = a % 360; if (d < 0) d += 360; return d;
  }

  function solveIntersection(points) {
    if (points.length < 2) return null;
    const lat0 = points[0].lat, lon0 = points[0].lon;
    let Axx = 0, Axy = 0, Ayx = 0, Ayy = 0; // A = sum(M_i)
    let bx = 0, by = 0; // b = sum(M_i p_i) + distance terms
    for (const p of points) {
      const { x, y } = llToXY(p.lat, p.lon, lat0, lon0);
      const th = (p.bearingTrueDeg) * Math.PI / 180;
      const ux = Math.sin(th), uy = Math.cos(th); // East, North
      const nx = -uy, ny = ux; // normal
      // Line constraint
      const Mnx_xx = nx * nx, Mnx_xy = nx * ny, Mnx_yy = ny * ny;
      Axx += Mnx_xx; Axy += Mnx_xy; Ayx += Mnx_xy; Ayy += Mnx_yy;
      bx += Mnx_xx * x + Mnx_xy * y;
      by += Mnx_xy * x + Mnx_yy * y;
      // Optional distance along bearing
      if (Number.isFinite(p.distanceM) && p.distanceM > 0) {
        const lambda = 0.25; // weight for distance penalty
        const Mu_xx = ux * ux * lambda, Mu_xy = ux * uy * lambda, Mu_yy = uy * uy * lambda;
        Axx += Mu_xx; Axy += Mu_xy; Ayx += Mu_xy; Ayy += Mu_yy;
        // b += (Mu * pvec) + lambda * d * u
        bx += Mu_xx * x + Mu_xy * y + lambda * p.distanceM * ux;
        by += Mu_xy * x + Mu_yy * y + lambda * p.distanceM * uy;
      }
    }
    // Solve 2x2: A * X = b
    const det = Axx * Ayy - Axy * Ayx;
    if (Math.abs(det) < 1e-12) return null;
    const invAxx =  Ayy / det;
    const invAxy = -Axy / det;
    const invAyx = -Ayx / det;
    const invAyy =  Axx / det;
    const Xx = invAxx * bx + invAxy * by;
    const Xy = invAyx * bx + invAyy * by;
    const { lat, lon } = xyToLL(Xx, Xy, lat0, lon0);
    return { lat, lon, x: Xx, y: Xy, ref: { lat0, lon0 } };
  }

  function bearingDistance(from, to) {
    const R = 6371000;
    const toRad = Math.PI / 180, toDeg = 180 / Math.PI;
    const lat1 = from.lat * toRad, lat2 = to.lat * toRad;
    const dLat = lat2 - lat1;
    const dLon = (to.lon - from.lon) * toRad;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    const brng = normalizeDeg(Math.atan2(y, x) * toDeg); // true bearing
    return { distanceM: dist, bearingDeg: brng };
  }

  function cardinal(deg) {
    const dirs = ['Β', 'ΒΑ', 'Α', 'ΝΑ', 'Ν', 'ΝΔ', 'Δ', 'ΒΔ', 'Β'];
    return dirs[Math.round(deg / 45)];
  }

  async function addPointFromUI() {
    const bearingMagDeg = parseFloat(document.getElementById('magBearing').value);
    if (!Number.isFinite(bearingMagDeg)) { alert('Δώστε μαγνητικό αζιμούθιο (°).'); return; }
    if (!survey.lastGPS) { alert('Πατήστε «Χρήση τρέχουσας θέσης» για να οριστεί σημείο.'); return; }
    const decl = await getDeclinationAt(survey.lastGPS.lat, survey.lastGPS.lon);
    const bearingTrueDeg = normalizeDeg(bearingMagDeg + (decl || 0));
    const d = parseFloat(document.getElementById('distance').value);
    const point = {
      lat: survey.lastGPS.lat,
      lon: survey.lastGPS.lon,
      bearingMagDeg,
      declinationDeg: decl,
      bearingTrueDeg,
      distanceM: Number.isFinite(d) ? d : undefined,
    };
    survey.points.push(point);
    renderSurveyList();
    ensureMap();
    addMarker(point.lat, point.lon, `P${survey.points.length}: ${point.bearingTrueDeg.toFixed(1)}°`);
  }

  function renderSurveyList() {
    const listEl = document.getElementById('surveyList');
    if (survey.points.length === 0) { listEl.textContent = '—'; return; }
    const rows = survey.points.map((p, i) => {
      const where = `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
      const declTxt = (typeof p.declinationDeg === 'number') ? `, dec=${p.declinationDeg.toFixed(2)}°` : '';
      const distTxt = (typeof p.distanceM === 'number') ? `, d=${p.distanceM.toFixed(1)}m` : '';
      return `${i+1}) ${where} — mag=${p.bearingMagDeg.toFixed(1)}°, true=${p.bearingTrueDeg.toFixed(1)}°${declTxt}${distTxt}`;
    });
    listEl.innerHTML = rows.map(r => `<div>${r}</div>`).join('');
  }

  async function useGPS() {
    const status = document.getElementById('geoStatus');
    status.textContent = 'Λήψη τοποθεσίας (Survey)…';
    if (!navigator.geolocation) { status.textContent = 'Ο browser δεν υποστηρίζει γεωεντοπισμό.'; return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      survey.lastGPS = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      status.textContent = `Θέση: ${survey.lastGPS.lat.toFixed(5)}, ${survey.lastGPS.lon.toFixed(5)}`;
    }, (err) => {
      status.textContent = 'Σφάλμα γεωεντοπισμού.';
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function solveAndRender() {
    const res = solveIntersection(survey.points);
    const outEl = document.getElementById('surveyResult');
    if (!res) { outEl.innerHTML = '<p class="warning">Χρειάζονται τουλάχιστον 2 κατάλληλες κατευθύνσεις.</p>'; return; }
    const last = survey.points[survey.points.length - 1];
    const off = bearingDistance({ lat: last.lat, lon: last.lon }, { lat: res.lat, lon: res.lon });
    const dirTxt = `${off.bearingDeg.toFixed(1)}° (${cardinal(off.bearingDeg)})`;
    const dev = parseFloat(document.getElementById('expectedDev').value) || 30;
    outEl.innerHTML = `
      <p>Εκτίμηση θέσης στόχου: <strong>${res.lat.toFixed(6)}, ${res.lon.toFixed(6)}</strong></p>
      <p>Από το τελευταίο σημείο: κίνηση <strong>${off.distanceM.toFixed(1)} m</strong> προς <strong>${dirTxt}</strong>.</p>
      <p>Ζώνη πιθανής απόκλισης: κύκλος ακτίνας <strong>${dev.toFixed(1)} m</strong> γύρω από το εκτιμώμενο σημείο.</p>
      <p class="muted small">Η γωνία είναι ως προς τον αληθινό βορρά (διορθωμένο με declination).</p>
    `;
    // Live compass guidance (if available)
    setupCompass(off.bearingDeg);
    ensureMap();
    if (targetMarker) { map.removeLayer(targetMarker); targetMarker = null; }
    targetMarker = L.marker([res.lat, res.lon], { title: 'Στόχος' })
      .addTo(map)
      .bindPopup('Εκτιμώμενος στόχος')
      .openPopup();
    map.flyTo([res.lat, res.lon], 17);
  }

  function setupCompass(targetTrueBearingDeg) {
    const statusEl = document.getElementById('compassStatus');
    const guideEl = document.getElementById('compassGuidance');
    if (!('ondeviceorientationabsolute' in window) && !('ondeviceorientation' in window)) {
      statusEl.textContent = 'Δεν υποστηρίζεται από τη συσκευή.';
      guideEl.textContent = '';
      return;
    }
    statusEl.textContent = 'Σε λειτουργία… κρατήστε τη συσκευή επίπεδη.';
    function handle(evt) {
      const alpha = evt.absolute ? evt.alpha : evt.alpha; // degrees from device
      if (typeof alpha !== 'number') return;
      // Assume alpha ~ true heading (ποικίλλει ανά συσκευή/browser). Εμφάνιση σχετικής απόκλισης.
      const heading = alpha; // deg
      let diff = targetTrueBearingDeg - heading;
      diff = ((diff + 540) % 360) - 180; // [-180, 180]
      const turn = diff > 0 ? 'στρίψε δεξιά' : 'στρίψε αριστερά';
      guideEl.innerHTML = `Κατεύθυνση στόχου: ${targetTrueBearingDeg.toFixed(0)}°. Πυξίδα: ${heading.toFixed(0)}°. ${turn} ~ ${Math.abs(diff).toFixed(0)}°.`;
      const magInput = document.getElementById('magBearing');
      if (magInput && magInput.disabled) {
        // populate magnetic bearing estimate by subtracting declination if available
        // We'll store last declination from recent fetch (if any)
        const declText = document.getElementById('declInfo').textContent;
        const m = declText.match(/([\-\d\.]+)°/);
        const decl = m ? parseFloat(m[1]) : 0;
        const magBearing = ((heading - decl) % 360 + 360) % 360;
        magInput.value = magBearing.toFixed(1);
      }
    }
    window.addEventListener('deviceorientationabsolute', handle);
    window.addEventListener('deviceorientation', handle);
  }

  // Enable compass capture to auto-fill magnetic bearing
  document.getElementById('btnEnableCompass').addEventListener('click', async () => {
    const statusEl = document.getElementById('compassStatus');
    try {
      // iOS needs permission
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') { statusEl.textContent = 'Άδεια πυξίδας απορρίφθηκε.'; return; }
      }
      statusEl.textContent = 'Πυξίδα ενεργή.';
    } catch (e) {
      statusEl.textContent = 'Σφάλμα ενεργοποίησης πυξίδας.';
    }
  });

  document.getElementById('btnAddPoint').addEventListener('click', addPointFromUI);
  document.getElementById('btnUseGPS').addEventListener('click', useGPS);
  document.getElementById('btnSolve').addEventListener('click', solveAndRender);

  // Memory (localStorage)
  const savedSetsSel = document.getElementById('savedSets');
  function refreshSets() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('survey:')).sort();
    savedSetsSel.innerHTML = '';
    keys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k.replace(/^survey:/,'');
      savedSetsSel.appendChild(opt);
    });
  }
  refreshSets();
  function saveSet() {
    const name = document.getElementById('memoryName').value.trim();
    if (!name) { alert('Δώστε όνομα σετ.'); return; }
    if (survey.points.length < 2) { alert('Χρειάζονται ≥2 σημεία για αποθήκευση.'); return; }
    localStorage.setItem(`survey:${name}`, JSON.stringify(survey.points));
    refreshSets();
  }
  function loadSet() {
    const key = savedSetsSel.value; if (!key) return;
    const val = localStorage.getItem(key);
    if (!val) return;
    try {
      const arr = JSON.parse(val);
      survey.points = Array.isArray(arr) ? arr : [];
      renderSurveyList();
      // plot markers
      ensureMap();
      // clear existing markers
      // not tracking marker refs individually per set; simple refresh:
      location.reload();
    } catch {}
  }
  function deleteSet() {
    const key = savedSetsSel.value; if (!key) return;
    localStorage.removeItem(key);
    refreshSets();
  }
  document.getElementById('btnSaveSet').addEventListener('click', saveSet);
  document.getElementById('btnLoadSet').addEventListener('click', loadSet);
  document.getElementById('btnDeleteSet').addEventListener('click', deleteSet);

  // Autosave after 4 points
  const origAddPoint = addPointFromUI;
  // already bound; we wrap autosave via survey.points length check in renderSurveyList
  const _renderSurveyList = renderSurveyList;
  renderSurveyList = function() {
    _renderSurveyList();
    const autoName = document.getElementById('memoryName').value.trim() || `auto-${new Date().toISOString().slice(0,19)}`;
    if (survey.points.length >= 4) {
      localStorage.setItem(`survey:${autoName}`, JSON.stringify(survey.points));
      refreshSets();
    }
  }
}

init();
