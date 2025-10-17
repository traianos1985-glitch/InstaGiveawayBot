/* Minimal map + geolocation + compass + target deviation */
(function(){
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [23.7275, 37.9838], // Athens
    zoom: 12
  });
  map.addControl(new maplibregl.NavigationControl());

  let userMarker = null;
  let accuracyCircle = null;
  let targetMarker = null;
  let follow = true;
  let watchId = null;
  let magHeadingDeg = null; // magnetic or device-provided true heading approximation
  let magnetometer = null; // Generic Sensor API
  let obs = []; // {lat,lon, trueHeading, ts}

  const el = (id)=>document.getElementById(id);
  const outLat=el('outLat'), outLon=el('outLon'), outAcc=el('outAcc');
  const outHeadMag=el('outHeadMag'), outHeadTrue=el('outHeadTrue'), outBearing=el('outBearing');
  const outDev=el('outDev'), outDist=el('outDist');
  const chkFollow=el('chkFollow');
  const inpDecl=el('inpDecl');
  const inpManualHead=el('inpManualHead');
  const outWmmD=el('outWmmD'), outWmmI=el('outWmmI'), outWmmH=el('outWmmH'), outWmmF=el('outWmmF');
  const outWmmX=el('outWmmX'), outWmmY=el('outWmmY'), outWmmZ=el('outWmmZ');
  const outWmmMeta=el('outWmmMeta');
  const outBx=el('outBx'), outBy=el('outBy'), outBz=el('outBz'), outBmag=el('outBmag');
  const outObsCount=el('outObsCount'), outSolve=el('outSolve');

  chkFollow.addEventListener('change', ()=>{ follow = chkFollow.checked; });

  function wrap360(deg){ return ((deg % 360)+360)%360; }
  function wrap180(deg){ let x=((deg+180)%360+360)%360; return x-180; }
  function deg2rad(d){ return d*Math.PI/180; }
  function rad2deg(r){ return r*180/Math.PI; }

  function setUserLocation(lon, lat){
    if(!userMarker){ userMarker = new maplibregl.Marker({color:'#1976d2'}).setLngLat([lon,lat]).addTo(map); }
    else userMarker.setLngLat([lon,lat]);
    if(follow){ map.easeTo({center:[lon,lat], zoom: Math.max(map.getZoom(), 15)}); }
  }

  function setAccuracy(lon, lat, acc){
    // Skip a real circle layer for simplicity; show text only
    outAcc.textContent = acc ? acc.toFixed(0)+' m' : '–';
  }

  function setTarget(lon, lat){
    if(!targetMarker){ targetMarker = new maplibregl.Marker({color:'#e53935'}).setLngLat([lon,lat]).addTo(map); }
    else targetMarker.setLngLat([lon,lat]);
    recompute();
  }

  function initialBearingDeg(lat1, lon1, lat2, lon2){
    const φ1=deg2rad(lat1), φ2=deg2rad(lat2); const Δλ=deg2rad(lon2-lon1);
    const y=Math.sin(Δλ)*Math.cos(φ2);
    const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    return wrap360(rad2deg(Math.atan2(y,x)));
  }
  function haversineMeters(lat1, lon1, lat2, lon2){
    const R=6371000; const φ1=deg2rad(lat1), φ2=deg2rad(lat2); const dφ=deg2rad(lat2-lat1); const dλ=deg2rad(lon2-lon1);
    const a=Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    const c=2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }

  let currentPos = null; // {lat, lon}

  function recompute(){
    if(!currentPos){ return; }
    const decl = parseFloat(inpDecl.value||'0')||0;
    let headingMag = null;
    if (inpManualHead.value && inpManualHead.value.trim() !== '') {
      headingMag = wrap360(parseFloat(inpManualHead.value)||0);
    } else if (magHeadingDeg!=null) {
      headingMag = wrap360(magHeadingDeg);
    }
    const headingTrue = (headingMag==null)? null : wrap360(headingMag + decl);
    if(headingMag!=null){ outHeadMag.textContent = headingMag.toFixed(1)+'°'; } else outHeadMag.textContent = '–';
    if(headingTrue!=null){ outHeadTrue.textContent = headingTrue.toFixed(1)+'°'; } else outHeadTrue.textContent = '–';

    if(targetMarker){
      const [tLon, tLat] = targetMarker.getLngLat().toArray();
      const bearing = initialBearingDeg(currentPos.lat, currentPos.lon, tLat, tLon);
      outBearing.textContent = bearing.toFixed(1)+'°';
      const dev = (headingTrue==null)? null : wrap180(bearing - headingTrue);
      if(dev!=null){ outDev.textContent = (dev>=0? 'Right ':'Left ') + Math.abs(dev).toFixed(1)+'°'; }
      else outDev.textContent = '–';
      const dist = haversineMeters(currentPos.lat, currentPos.lon, tLat, tLon);
      outDist.textContent = dist>=1000? (dist/1000).toFixed(2)+' km' : dist.toFixed(0)+' m';
    } else {
      outBearing.textContent = '–';
      outDev.textContent = '–';
      outDist.textContent = '–';
    }
  }

  map.on('click', (e)=>{ setTarget(e.lngLat.lng, e.lngLat.lat); });

  // Geolocation
  el('btnUseLocation').addEventListener('click', ()=>{
    if(!('geolocation' in navigator)) { alert('Geolocation not supported'); return; }
    if(watchId!=null){ navigator.geolocation.clearWatch(watchId); }
    watchId = navigator.geolocation.watchPosition(
      p=>{
        const lat=p.coords.latitude, lon=p.coords.longitude; currentPos={lat,lon};
        outLat.textContent = lat.toFixed(6);
        outLon.textContent = lon.toFixed(6);
        setUserLocation(lon, lat);
        setAccuracy(lon, lat, p.coords.accuracy);
        recompute();
      },
      err=>{ console.warn(err); alert('Geolocation error: '+err.message); },
      { enableHighAccuracy:true, maximumAge:5000, timeout:10000 }
    );
  });

  // Compass (iOS needs user gesture/permission)
  el('btnCompass').addEventListener('click', async ()=>{
    try{
      const anyWin = window;
      if (anyWin.DeviceOrientationEvent && typeof anyWin.DeviceOrientationEvent.requestPermission === 'function'){
        const resp = await anyWin.DeviceOrientationEvent.requestPermission();
        if (resp !== 'granted') { alert('Compass permission denied'); return; }
      }
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
      alert('Compass enabled. Move device for updates.');
    }catch(e){ alert('Compass not available'); }
  });
  function onOrient(ev){
    // Prefer absolute true heading if provided; otherwise use alpha (device frame)
    let heading = null;
    if (typeof ev.webkitCompassHeading === 'number') {
      heading = ev.webkitCompassHeading; // iOS gives true heading
    } else if (ev.absolute && typeof ev.alpha === 'number') {
      // alpha is rotation around Z (0..360), but frame varies by device; treat as magnetic approx
      heading = 360 - ev.alpha; // attempt to align clockwise from north
    }
    if(heading!=null){ magHeadingDeg = wrap360(heading); recompute(); }
  }

  // Magnetometer
  el('btnMagneto').addEventListener('click', async ()=>{
    try{
      const anyWin = window;
      if (anyWin.DeviceMotionEvent && typeof anyWin.DeviceMotionEvent.requestPermission === 'function'){
        try{ await anyWin.DeviceMotionEvent.requestPermission(); }catch{}
      }
      if ('Magnetometer' in window) {
        magnetometer = new window.Magnetometer({ frequency: 10 });
        magnetometer.addEventListener('reading', () => {
          const bx = magnetometer.x; // µT
          const by = magnetometer.y;
          const bz = magnetometer.z;
          const bmag = Math.sqrt(bx*bx + by*by + bz*bz);
          outBx.textContent = bx.toFixed(1);
          outBy.textContent = by.toFixed(1);
          outBz.textContent = bz.toFixed(1);
          outBmag.textContent = bmag.toFixed(1);
        });
        magnetometer.addEventListener('error', (e)=>{ console.warn('Magnetometer error', e.error || e); });
        magnetometer.start();
        alert('Magnetometer enabled');
      } else {
        alert('Magnetometer not supported on this device/browser');
      }
    }catch(e){ alert('Magnetometer failed'); }
  });

  // WMM predicted field (NOAA-like service). If CORS fails, user can input declination manually.
  el('btnFetchWMM').addEventListener('click', async ()=>{
    if(!currentPos){ alert('No position yet'); return; }
    try{
      const date = new Date();
      const y = date.getUTCFullYear();
      const url = `https://geomag.amentum.space/wmm?lat=${currentPos.lat}&lon=${currentPos.lon}&alt=0&year=${y}`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const d = await r.json();
      // Expect keys: declination, inclination, H, F, X, Y, Z (deg, nT)
      if (typeof d.declination === 'number') { inpDecl.value = d.declination.toFixed(2); }
      outWmmD.textContent = (d.declination!=null)? d.declination.toFixed(2)+'°' : '–';
      outWmmI.textContent = (d.inclination!=null)? d.inclination.toFixed(2)+'°' : '–';
      outWmmH.textContent = (d.H!=null)? d.H.toFixed(0) : '–';
      outWmmF.textContent = (d.F!=null)? d.F.toFixed(0) : '–';
      outWmmX.textContent = (d.X!=null)? d.X.toFixed(0) : '–';
      outWmmY.textContent = (d.Y!=null)? d.Y.toFixed(0) : '–';
      outWmmZ.textContent = (d.Z!=null)? d.Z.toFixed(0) : '–';
      outWmmMeta.textContent = d.model ? `${d.model} ${d.epoch||''}` : '';
      recompute();
    }catch(e){ alert('WMM fetch failed due to CORS or network. Enter declination manually.'); }
  });

  // Observations: store bearing lines and solve intersection (least squares).
  function addObservation(){
    if(!currentPos) { alert('No position'); return; }
    const decl = parseFloat(inpDecl.value||'0')||0;
    let headingMag = null;
    if (inpManualHead.value && inpManualHead.value.trim() !== '') headingMag = wrap360(parseFloat(inpManualHead.value)||0);
    else if (magHeadingDeg!=null) headingMag = wrap360(magHeadingDeg);
    if (headingMag==null) { alert('No heading (enable compass or set manual)'); return; }
    const trueHeading = wrap360(headingMag + decl);
    const rec = { lat: currentPos.lat, lon: currentPos.lon, trueHeading, ts: Date.now() };
    obs.push(rec);
    outObsCount.textContent = String(obs.length);
    // Draw a short ray on map
    const len = 0.005; // ~0.5km at mid-lat
    const brng = deg2rad(trueHeading);
    const dx = len * Math.sin(brng);
    const dy = len * Math.cos(brng);
    const p1 = [rec.lon, rec.lat];
    const p2 = [rec.lon + dx/Math.cos(deg2rad(rec.lat)), rec.lat + dy];
    map.addSource(`ray-${rec.ts}`, { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:[p1,p2] }}});
    map.addLayer({ id:`ray-${rec.ts}`, type:'line', source:`ray-${rec.ts}`, paint:{ 'line-color':'#9c27b0', 'line-width':2, 'line-dasharray':[2,2] }});
    persist();
  }
  el('btnAddObs').addEventListener('click', addObservation);

  function solveTarget(){
    if (obs.length < 2) { alert('Need at least 2 observations'); return; }
    // Solve intersection of multiple rays using linearized least squares in local ENU around centroid.
    const lat0 = obs.reduce((s,o)=>s+o.lat,0)/obs.length;
    const lon0 = obs.reduce((s,o)=>s+o.lon,0)/obs.length;
    const toENU = (lat,lon)=>{
      const dN = (lat - lat0) * 111320; // meters per deg approx
      const dE = (lon - lon0) * 111320 * Math.cos(deg2rad(lat0));
      return [dE, dN];
    };
    const fromENU = (e,n)=>{
      const lat = lat0 + n/111320;
      const lon = lon0 + e/(111320*Math.cos(deg2rad(lat0)));
      return {lat, lon};
    };
    // Each ray i: point pi=(ei,ni), unit direction ui=(sin b, cos b). Solve for point x minimizing sum |(x-pi) x ui|^2.
    let A11=0, A12=0, A22=0, b1=0, b2=0;
    for(const o of obs){
      const [ei, ni] = toENU(o.lat, o.lon);
      const br = deg2rad(o.trueHeading);
      const ux = Math.sin(br), uy = Math.cos(br);
      // Projection matrix to perpendicular of u: P = I - u u^T
      const p11 = 1-ux*ux, p12 = -ux*uy, p22 = 1-uy*uy;
      A11 += p11; A12 += p12; A22 += p22;
      b1  += p11*ei + p12*ni;
      b2  += p12*ei + p22*ni;
    }
    const det = A11*A22 - A12*A12;
    if (Math.abs(det) < 1e-9) { alert('Degenerate geometry'); return; }
    const ex = ( A22*b1 - A12*b2)/det;
    const ny = (-A12*b1 + A11*b2)/det;
    const sol = fromENU(ex, ny);
    outSolve.textContent = `${sol.lat.toFixed(6)}, ${sol.lon.toFixed(6)}`;
    // Add marker
    new maplibregl.Marker({color:'#43a047'}).setLngLat([sol.lon, sol.lat]).addTo(map);
    persist();
  }
  el('btnSolve').addEventListener('click', solveTarget);

  function persist(){
    try{
      const data = { obs, target: targetMarker? targetMarker.getLngLat().toArray(): null };
      localStorage.setItem('larmor_map_session', JSON.stringify(data));
    }catch{}
  }
  function restore(){
    try{
      const raw = localStorage.getItem('larmor_map_session');
      if(!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.obs)) { obs = data.obs; outObsCount.textContent = String(obs.length); }
      if (Array.isArray(data.target) && data.target.length===2) setTarget(data.target[0], data.target[1]);
    }catch{}
  }
  restore();

  // Export CSV
  el('btnExport').addEventListener('click', ()=>{
    const rows = [['lat','lon','trueHeading_deg','timestamp']];
    for(const o of obs){ rows.push([o.lat,o.lon,o.trueHeading,o.ts]); }
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'observations.csv';
    a.click();
  });

  // Clear
  el('btnClear').addEventListener('click', ()=>{
    obs = []; outObsCount.textContent = '0'; outSolve.textContent='–';
    // Remove ray layers
    map.getStyle().layers.slice().forEach(layer=>{
      if (layer.id.startsWith('ray-')) {
        try{ map.removeLayer(layer.id); }catch{}
        try{ map.removeSource(layer.id); }catch{}
      }
    });
    // Remove green markers (solution markers): not tracked; just refresh page for full clear if needed.
    localStorage.removeItem('larmor_map_session');
  });

  // Declination fetch (NOAA WMM web service alternative). If blocked, user can enter manually.
  el('btnFetchDecl').addEventListener('click', async ()=>{
    if(!currentPos){ alert('No position yet'); return; }
    try{
      // Try simple API (example service). Replace with a proper WMM endpoint if available.
      const date = new Date();
      const y = date.getUTCFullYear();
      const url = `https://geomag.amentum.space/wmm?lat=${currentPos.lat}&lon=${currentPos.lon}&alt=0&year=${y}`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();
      if(typeof data.declination !== 'number') throw new Error('Invalid response');
      inpDecl.value = data.declination.toFixed(2);
      recompute();
    }catch(e){
      alert('Declination fetch failed. Enter manually.');
    }
  });

  // Recompute when declination changes
  inpDecl.addEventListener('input', recompute);
})();
