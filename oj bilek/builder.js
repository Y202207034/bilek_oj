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

  // 점 추가 & 드래그 편집을 위한 헬퍼
  function makeDraggableMarker(latlng, index){
    const mk = L.circleMarker(latlng, { radius: 6, color: '#4c6ef5', weight: 2, fillColor: '#4c6ef5', fillOpacity: 1 });
    mk.addTo(map);
    // 간단 드래그: mousedown -> mousemove -> mouseup
    let dragging = false;
    function onMouseMove(ev){ if (!dragging) return; const p = ev.latlng; points[index] = p; mk.setLatLng(p); refresh(); }
    function onMouseUp(){ if (!dragging) return; dragging = false; map.off('mousemove', onMouseMove); map.off('mouseup', onMouseUp); }
    mk.on('mousedown', ()=>{ dragging = true; map.on('mousemove', onMouseMove); map.on('mouseup', onMouseUp); });
    return mk;
  }

  map.on('click', (e)=>{
    const p = e.latlng;
    const idx = points.length;
    points.push(p);
    const mk = makeDraggableMarker(p, idx);
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
    const params = new URLSearchParams(location.search);
    const editId = params.get('editId');
    if (editId){
      const idNum = Number(editId);
      const idx = saved.findIndex(r => Number(r.id) === idNum);
      if (idx >= 0){
        const prev = saved[idx];
        saved[idx] = { id: prev.id, title, route: coords, distance, duration, createdAt: prev.createdAt || createdAt };
      } else {
        const id = idNum || ((saved.length ? Math.max(...saved.map(r=>r.id||0)) : 0) + 1);
        saved.push({ id, title, route: coords, distance, duration, createdAt });
      }
    } else {
      const id = (saved.length ? Math.max(...saved.map(r=>r.id||0)) : 0) + 1;
      saved.push({ id, title, route: coords, distance, duration, createdAt });
    }
    localStorage.setItem('savedRoutes', JSON.stringify(saved));

    window.location.href = 'bike_feed.html';
  }

  saveBtn.addEventListener('click', saveRoute);

  // 편집 모드로 진입 시 기존 경로 불러오기
  (function initEdit(){
    const params = new URLSearchParams(location.search);
    const editId = params.get('editId');
    if (!editId) return;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('savedRoutes')||'[]'); if(!Array.isArray(saved)) saved=[]; } catch(_) { saved=[]; }
    const route = saved.find(r => String(r.id) === String(editId));
    if (!route || !Array.isArray(route.route) || route.route.length === 0) return;
    titleEl.value = route.title || '';
    // 좌표 로드
    route.route.forEach((arr, i)=>{
      const p = L.latLng(arr[0], arr[1]);
      points.push(p);
      const mk = makeDraggableMarker(p, i);
      markers.push(mk);
    });
    // 보기 좋은 영역으로 fit
    try {
      const latlngs = points.map(p=>[p.lat,p.lng]);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.2));
    } catch(_){}
    refresh();
  })();
})();


