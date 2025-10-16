import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Preset Messinia locations (approximate coordinates)
const MESSINIA_PLACES = [
  { name: 'Κυπαρισσία', lat: 37.252, lon: 21.673 },
  { name: 'Φιλιατρά', lat: 37.156, lon: 21.584 },
  { name: 'Μάλη', lat: 37.190, lon: 21.606 },
  { name: 'Σιδηρόκαστρο', lat: 37.399, lon: 21.628 },
  { name: 'Πλατάνια', lat: 37.268, lon: 21.705 },
  { name: 'Καρυές', lat: 37.080, lon: 22.100 },
  { name: 'Στασιό', lat: 37.268, lon: 21.692 },
  { name: 'Μουζάκι', lat: 37.105, lon: 21.817 }
];

app.get('/api/places', (req, res) => {
  res.json({ places: MESSINIA_PLACES });
});

function parseDate(dateStr) {
  return dateStr ? new Date(dateStr) : new Date();
}

function dateToDecimalYear(date) {
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const frac = (date - start) / (end - start);
  return year + frac;
}

// NOAA proxy: returns total intensity (F) in Tesla
app.get('/api/field/noaa', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const alt = req.query.alt ? parseFloat(req.query.alt) : 0; // meters
    const date = parseDate(req.query.date);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Παρακαλώ δώστε έγκυρα lat/lon' });
    }

    const decYear = dateToDecimalYear(date);
    const altKm = Number.isFinite(alt) ? alt / 1000 : 0;
    const url = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculate?lat1=${lat}&lon1=${lon}&model=WMM&startYear=${decYear}&endYear=${decYear}&coordUnits=DD&altitude=${altKm}&altitudeUnits=KILOMETERS&resultFormat=json`;

    const r = await fetch(url, {
      headers: { 'User-Agent': 'larmor-app/1.0 (+contact@example.com)' }
    });
    const data = await r.json();

    const result = (data.result && data.result[0]) || data;
    const totalNT = result.totalintensity || result.totalIntensity || result.F || result['total-intensity'];
    if (!totalNT) {
      return res.status(502).json({ error: 'Μη αναμενόμενη απόκριση NOAA', raw: data });
    }

    const totalT = totalNT * 1e-9;
    res.json({ provider: 'NOAA', lat, lon, altitudeMeters: alt, date: date.toISOString(), decimalYear: decYear, totalIntensityT: totalT, units: 'T', raw: result });
  } catch (err) {
    res.status(502).json({ error: 'Αποτυχία κλήσης NOAA', details: String(err) });
  }
});

// BGS proxy: returns total intensity (F) in Tesla
app.get('/api/field/bgs', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const alt = req.query.alt ? parseFloat(req.query.alt) : 0; // meters
    const date = parseDate(req.query.date);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Παρακαλώ δώστε έγκυρα lat/lon' });
    }

    const iso = date.toISOString();
    const altKm = Number.isFinite(alt) ? alt / 1000 : 0;

    // Try latest model first, then fallbacks
    const urlCandidates = [
      `https://geomag.bgs.ac.uk/web_service/GMModels/wmm/latest?latitude=${lat}&longitude=${lon}&altitude=${altKm}&date=${encodeURIComponent(iso)}&format=json`,
      `https://geomag.bgs.ac.uk/web_service/GMModels/wmm/2025?latitude=${lat}&longitude=${lon}&altitude=${altKm}&date=${encodeURIComponent(iso)}&format=json`,
      `https://geomag.bgs.ac.uk/web_service/GMModels/wmm/2025-2030?latitude=${lat}&longitude=${lon}&altitude=${altKm}&date=${encodeURIComponent(iso)}&format=json`,
      `https://geomag.bgs.ac.uk/web_service/GMModels/wmm/2020-2025?latitude=${lat}&longitude=${lon}&altitude=${altKm}&date=${encodeURIComponent(iso)}&format=json`
    ];

    let data = null;
    let lastError = null;
    for (const u of urlCandidates) {
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'larmor-app/1.0 (+contact@example.com)' } });
        if (!r.ok) { lastError = `HTTP ${r.status}`; continue; }
        data = await r.json();
        if (data) break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!data) {
      return res.status(502).json({ error: 'Αποτυχία κλήσης BGS', details: String(lastError) });
    }

    const result = data && data.result ? data.result : data;
    const totalNT = result.total_intensity || result['total-intensity'] || result.F;
    if (!totalNT) {
      return res.status(502).json({ error: 'Μη αναμενόμενη απόκριση BGS', raw: data });
    }

    const totalT = totalNT * 1e-9;
    res.json({ provider: 'BGS', lat, lon, altitudeMeters: alt, date: iso, totalIntensityT: totalT, units: 'T', raw: result });
  } catch (err) {
    res.status(502).json({ error: 'Αποτυχία κλήσης BGS', details: String(err) });
  }
});

// Nominatim geocoding proxy for place names (optional use)
app.get('/api/geocode', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Απαιτείται q' });
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&accept-language=el`;
    const r = await fetch(url, { headers: { 'User-Agent': 'larmor-app/1.0 (+contact@example.com)' } });
    const arr = await r.json();
    if (!arr || arr.length === 0) return res.status(404).json({ error: 'Δεν βρέθηκε' });
    const item = arr[0];
    res.json({ query: q, lat: parseFloat(item.lat), lon: parseFloat(item.lon), display_name: item.display_name });
  } catch (err) {
    res.status(502).json({ error: 'Αποτυχία γεωκωδικοποίησης', details: String(err) });
  }
});

// Fallback SPA route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
