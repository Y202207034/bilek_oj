(function(){
  const map = L.map('map').setView([37.5665, 126.9780], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

  const points = [];
  const markers = [];
  const poly = L.polyline([], { color: '#4c6ef5', weight: 4 }).addTo(map);

  const statsEl = document.getElementById('stats');
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const undoBtn = document.getElementById('undoBtn');
  const titleEl = document.getElementById('routeTitle');

  function toKm(m){ return Math.round(m/10)/100; }
  function estimateDurationMin(km){ const avgSpeedKmh = 20; return Math.round((km/avgSpeedKmh)*60); }

  function computeDistanceMeters(latlngs){
    if (latlngs.length < 2) return 0;
    let m = 0;
    for (let i=1;i<latlngs.length;i++){
      m += map.distance(latlngs[i-1], latlngs[i]);
    }
    return m;
  }

  function refresh(){
    poly.setLatLngs(points);
    const meters = computeDistanceMeters(points);
    const km = toKm(meters*10);
    const min = estimateDurationMin(km);
    statsEl.textContent = `거리 ${km.toFixed(1)} km · ${min} 분`;
    saveBtn.disabled = !(points.length >= 2 && titleEl.value.trim().length);
  }

  map.on('click', (e)=>{
    const p = e.latlng;
    points.push(p);
    const mk = L.circleMarker(p, { radius: 5, color: '#4c6ef5', weight: 2, fillColor: '#4c6ef5', fillOpacity: 1 });
    mk.addTo(map);
    markers.push(mk);
    refresh();
  });

  undoBtn.addEventListener('click', ()=>{
    if (!points.length) return;
    points.pop();
    const mk = markers.pop();
    if (mk) mk.remove();
    refresh();
  });

  clearBtn.addEventListener('click', ()=>{
    while(markers.length){ const m = markers.pop(); m.remove(); }
    points.length = 0;
    refresh();
  });

  titleEl.addEventListener('input', refresh);

  function saveRoute(){
    const title = titleEl.value.trim() || '제목 없음';
    if (points.length < 2) { alert('점이 2개 이상이어야 합니다.'); return; }
    const coords = points.map(p => [p.lat, p.lng]);
    const meters = computeDistanceMeters(points);
    const distance = Number((meters/1000).toFixed(1));
    const duration = estimateDurationMin(distance);
    const createdAt = new Date().toISOString();

    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('savedRoutes')||'[]'); if(!Array.isArray(saved)) saved=[]; } catch(_) { saved=[]; }
    const id = (saved.length ? Math.max(...saved.map(r=>r.id||0)) : 0) + 1;
    const route = { id, title, route: coords, distance, duration, createdAt };
    saved.push(route);
    localStorage.setItem('savedRoutes', JSON.stringify(saved));

    window.location.href = 'bike_feed.html';
  }

  saveBtn.addEventListener('click', saveRoute);
})();


