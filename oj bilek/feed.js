// Feed JS extracted from bike_feed.html
(function(){
  const grid = document.getElementById('rgGrid');
  const empty = document.getElementById('rgEmpty');

  function loadSavedRoutes(){
    try {
      const raw = localStorage.getItem('savedRoutes');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.sort((a,b)=> (b.id||0)-(a.id||0)) : [];
    } catch(_) { return []; }
  }

  function formatDate(iso){
    try { return new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); } catch(_) { return ''; }
  }

  function getLikeState(){ try { return JSON.parse(localStorage.getItem('ridegram_likes')||'{}') || {}; } catch(_){ return {}; } }
  function setLikeState(state){ localStorage.setItem('ridegram_likes', JSON.stringify(state)); }
  function getLikeCounts(){ try { return JSON.parse(localStorage.getItem('ridegram_like_counts')||'{}') || {}; } catch(_){ return {}; } }
  function setLikeCounts(counts){ localStorage.setItem('ridegram_like_counts', JSON.stringify(counts)); }

  function projectRouteToBox(coords, width, height) {
    const lats = coords.map(p=>p[0]);
    const lngs = coords.map(p=>p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 6; const w = width - pad*2; const h = height - pad*2;
    const dx = Math.max(maxLng-minLng, 1e-6); const dy = Math.max(maxLat-minLat, 1e-6);
    return coords.map(([lat,lng])=>{
      const x = pad + ((lng-minLng)/dx)*w;
      const y = pad + (1- (lat-minLat)/dy)*h;
      return [Math.round(x*100)/100, Math.round(y*100)/100];
    });
  }

  function createCard(post){
    const card = document.createElement('article');
    card.className = 'rg-card';
    const media = document.createElement('div');
    media.className = 'rg-media';
    if (Array.isArray(post.route) && post.route.length > 1) {
      const pts = projectRouteToBox(post.route, 100, 100).map(p=>p.join(',')).join(' ');
      media.innerHTML = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="0" y="0" width="100" height="100" fill="url(#bg)"/>
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f0f3ff"/>
              <stop offset="100%" stop-color="#e9f2ff"/>
            </linearGradient>
          </defs>
          <polyline points="${pts}" fill="none" stroke="#4c6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>`;
    } else {
      media.innerHTML = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="30" cy="70" r="15" stroke="#4c6ef5" stroke-width="4" fill="none"/>
          <circle cx="78" cy="70" r="15" stroke="#4c6ef5" stroke-width="4" fill="none"/>
          <path d="M30 70 L50 55 L65 70" stroke="#4c6ef5" stroke-width="4" fill="none"/>
          <path d="M50 55 L60 40 L75 40" stroke="#4c6ef5" stroke-width="4" fill="none"/>
          <circle cx="60" cy="40" r="4" fill="#4c6ef5"/>
        </svg>`;
    }
    const body = document.createElement('div');
    body.className = 'rg-body';
    const row = document.createElement('div');
    row.className = 'rg-row';
    const title = document.createElement('div');
    title.className = 'rg-title-text';
    title.textContent = post.title;
    const time = document.createElement('div');
    time.className = 'rg-time';
    time.textContent = formatDate(post.createdAt || new Date());
    row.appendChild(title);
    row.appendChild(time);
    const meta = document.createElement('div');
    meta.className = 'rg-meta';
    const dist = typeof post.distance === 'number' ? `${post.distance.toFixed(1)}km` : String(post.distance||'0km');
    const dur = typeof post.duration === 'number' ? `${post.duration}분` : String(post.duration||'0분');
    meta.textContent = `거리 ${dist} · ${dur}`;
    const actions = document.createElement('div');
    actions.className = 'rg-actions-row';
    const like = document.createElement('button');
    like.type = 'button';
    like.className = 'rg-action rg-like';
    like.setAttribute('aria-pressed', 'false');
    like.innerHTML = '❤ 좋아요 <span class="rg-like-count" aria-hidden="true"></span>';
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'rg-action rg-action-primary';
    share.textContent = '공유';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'rg-action';
    del.textContent = '🗑️';
    del.setAttribute('aria-label', '삭제');
    del.title = '삭제';
    actions.appendChild(like);
    actions.appendChild(share);
    actions.appendChild(del);
    body.appendChild(row);
    body.appendChild(meta);
    body.appendChild(actions);
    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  async function sharePost(post){
    const text = `라이딩: ${post.title} • ${post.distance}km • ${post.duration}분`;
    const url = location.href;
    try { if (navigator.share) { await navigator.share({ title: 'Ridegram', text, url }); return; } } catch(_) {}
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); alert('링크가 복사되었습니다.'); return; } } catch(_) {}
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch(_) {}
    ta.remove(); alert('링크가 복사되었습니다.');
  }

  function render(){
    grid.innerHTML = '';
    let posts = loadSavedRoutes();
    if (!posts.length){ empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    const likeState = getLikeState();
    const likeCounts = Object.assign({} , getLikeCounts());
    posts.forEach(p => {
      if (likeCounts[p.id] == null) likeCounts[p.id] = Math.floor(Math.random()*20)+1;
      const card = createCard(p);
      const likeBtn = card.querySelector('.rg-like');
      const countEl = card.querySelector('.rg-like-count');
      const isLiked = Boolean(likeState[p.id]);
      likeBtn.classList.toggle('liked', isLiked);
      likeBtn.setAttribute('aria-pressed', String(isLiked));
      countEl.textContent = String(likeCounts[p.id] + (isLiked ? 1 : 0));
      likeBtn.addEventListener('click', () => {
        const current = getLikeState();
        const now = Boolean(current[p.id]);
        const next = Object.assign({}, current);
        if (now) { delete next[p.id]; } else { next[p.id] = true; }
        setLikeState(next);
        const after = Boolean(next[p.id]);
        likeBtn.classList.toggle('liked', after);
        likeBtn.setAttribute('aria-pressed', String(after));
        countEl.textContent = String(likeCounts[p.id] + (after ? 1 : 0));
      });
      const shareBtn = card.querySelector('.rg-action-primary');
      shareBtn.addEventListener('click', () => sharePost(p));
      const delBtn = card.querySelector('.rg-action:last-child');
      delBtn.addEventListener('click', () => deletePost(p.id));
      grid.appendChild(card);
    });
    setLikeCounts(likeCounts);
  }

  // 간단한 정렬(최근/거리/시간)
  function sortBy(key){
    const routes = loadSavedRoutes();
    if (key === 'recent') routes.sort((a,b)=> (b.id||0)-(a.id||0));
    if (key === 'distance') routes.sort((a,b)=> (Number(b.distance||0)) - (Number(a.distance||0)));
    if (key === 'duration') routes.sort((a,b)=> (Number(b.duration||0)) - (Number(a.duration||0)));
    // 임시로 렌더에 반영: grid 비우고 순회하며 DOM 생성
    grid.innerHTML = '';
    empty.style.display = routes.length ? 'none':'block';
    const likeState = getLikeState();
    const likeCounts = Object.assign({} , getLikeCounts());
    routes.forEach(p => {
      if (likeCounts[p.id] == null) likeCounts[p.id] = Math.floor(Math.random()*20)+1;
      const card = createCard(p);
      const likeBtn = card.querySelector('.rg-like');
      const countEl = card.querySelector('.rg-like-count');
      const isLiked = Boolean(likeState[p.id]);
      likeBtn.classList.toggle('liked', isLiked);
      likeBtn.setAttribute('aria-pressed', String(isLiked));
      countEl.textContent = String(likeCounts[p.id] + (isLiked ? 1 : 0));
      likeBtn.addEventListener('click', () => {
        const current = getLikeState();
        const now = Boolean(current[p.id]);
        const next = Object.assign({}, current);
        if (now) { delete next[p.id]; } else { next[p.id] = true; }
        setLikeState(next);
        const after = Boolean(next[p.id]);
        likeBtn.classList.toggle('liked', after);
        likeBtn.setAttribute('aria-pressed', String(after));
        countEl.textContent = String(likeCounts[p.id] + (after ? 1 : 0));
      });
      const shareBtn = card.querySelector('.rg-action-primary');
      shareBtn.addEventListener('click', () => sharePost(p));
      const delBtn = card.querySelector('.rg-action:last-child');
      delBtn.addEventListener('click', () => deletePost(p.id));
      grid.appendChild(card);
    });
    setLikeCounts(likeCounts);
  }

  document.getElementById('createRouteBtn').addEventListener('click', function(){
    window.location.href = 'route_builder.html';
  });
  function deletePost(id){
    if (!confirm('정말 삭제하시겠습니까?')) return;
    let posts = [];
    try { posts = JSON.parse(localStorage.getItem('savedRoutes')||'[]'); if(!Array.isArray(posts)) posts=[]; } catch(_) { posts = []; }
    posts = posts.filter(r => r.id !== id);
    localStorage.setItem('savedRoutes', JSON.stringify(posts));
    render();
  }
  // theme toggle
  function applyTheme(isDark){
    // apply theme attribute on <html> to affect the whole document
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try { localStorage.setItem('ridegram_theme_dark', JSON.stringify(!!isDark)); } catch(_){}
    const btn = document.getElementById('themeToggleBtn');
    if (btn){
      btn.setAttribute('aria-pressed', String(!!isDark));
      btn.textContent = isDark ? '☀ 낮' : '🌙 야간';
      if (btn.dataset) btn.dataset.variant = isDark ? 'ghost' : '';
    }
  }

  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const current = JSON.parse(localStorage.getItem('ridegram_theme_dark')||'false');
    applyTheme(!current);
  });

  document.addEventListener('DOMContentLoaded', () => {
    // init theme from storage or prefers
    const stored = localStorage.getItem('ridegram_theme_dark');
    let dark = stored != null ? JSON.parse(stored) : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(dark);
    // chip handlers
    const chips = document.querySelectorAll('.chip');
    chips.forEach((c,i)=>{
      c.addEventListener('click', ()=>{
        chips.forEach(x=>x.classList.remove('chip-active'));
        c.classList.add('chip-active');
        if (c.textContent.includes('최근')) sortBy('recent');
        else if (c.textContent.includes('거리')) sortBy('distance');
        else if (c.textContent.includes('시간')) sortBy('duration');
        else render();
      });
    });
    render();
  });
})();


