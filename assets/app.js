/* ============================================================
   JerryMusic  /  assets/app.js
   - loads tracks.json (static library)
   - renders grid, search, tag filter, sort
   - bottom persistent audio player with playlist
   ============================================================ */
(function () {
  'use strict';

  var TRACKS_URL = 'tracks.json?v=' + Date.now();
  var tracks = [];
  var queue = [];          // current playing order (array of track objects)
  var currentIndex = -1;   // index within queue
  var activeTags = {};     // selected tag filters
  var sortMode = 'time';
  var source = 'library';   // 'library' (tracks.json) | 'community' (/api/tracks)

  var audio = document.getElementById('audio');
  var grid = document.getElementById('grid');
  var chips = document.getElementById('chips');
  var empty = document.getElementById('empty');
  var qInput = document.getElementById('q');

  /* ---------- i18n helper ---------- */
  function lang() { return (window.__lang && window.__lang()) === 'en' ? 'en' : 'zh'; }
  function pick(o, zhKey, enKey) {
    if (!o) return '';
    var en = o[enKey], zh = o[zhKey];
    return lang() === 'en' ? (en || zh || '') : (zh || en || '');
  }

  /* ---------- theme toggle button ---------- */
  function initThemeBtn() {
    var box = document.getElementById('hdrRight');
    if (!box) return;
    var b = document.createElement('button');
    b.className = 'theme-btn';
    b.setAttribute('data-theme-toggle', '');
    b.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
    b.title = '切换明暗';
    b.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('jm-theme', next); } catch (e) {}
      b.textContent = next === 'light' ? '🌙' : '☀️';
    });
    box.appendChild(b);
  }

  /* ---------- helpers ---------- */
  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function allTags() {
    var set = {};
    tracks.forEach(function (t) {
      (t.tags || []).forEach(function (x) { set[x] = 1; });
    });
    return Object.keys(set);
  }

  function filtered() {
    var q = (qInput.value || '').trim().toLowerCase();
    var res = tracks.filter(function (t) {
      var hay = [
        pick(t, 'title', 'titleEn'),
        pick(t, 'artist', 'artistEn'),
        pick(t, 'album', 'albumEn'),
        (t.tags || []).join(' ')
      ].join(' ').toLowerCase();
      if (q && hay.indexOf(q) === -1) return false;
      var tags = t.tags || [];
      for (var k in activeTags) {
        if (activeTags[k] && tags.indexOf(k) === -1) return false;
      }
      return true;
    });
    if (sortMode === 'title') {
      res.sort(function (a, b) {
        return pick(a, 'title', 'titleEn').localeCompare(pick(b, 'title', 'titleEn'), lang());
      });
    } else {
      res.sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); });
    }
    return res;
  }

  function renderChips() {
    var tags = allTags();
    chips.innerHTML = '';
    tags.forEach(function (tg) {
      var el = document.createElement('span');
      el.className = 'chip' + (activeTags[tg] ? ' on' : '');
      el.textContent = tg;
      el.addEventListener('click', function () {
        if (activeTags[tg]) delete activeTags[tg]; else activeTags[tg] = 1;
        renderChips(); renderGrid();
      });
      chips.appendChild(el);
    });
  }

  function renderGrid() {
    var list = filtered();
    queue = list.slice();
    grid.innerHTML = '';
    if (list.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.forEach(function (t, i) {
      var card = document.createElement('div');
      card.className = 'card';
      var cover = t.cover
        ? '<img src="' + t.cover + '" alt="">'
        : '<span class="ph">♪</span>';
      var tags = (t.tags || []).map(function (x) { return '<span class="tag">' + x + '</span>'; }).join('');
      card.innerHTML =
        '<div class="thumb">' + cover +
        '<div class="play-overlay">▶</div>' +
        (t.duration ? '<span class="dur">' + fmt(t.duration) + '</span>' : '') +
        '</div>' +
        '<div class="body">' +
        '<div class="title">' + escapeHtml(pick(t, 'title', 'titleEn')) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(pick(t, 'artist', 'artistEn')) + '</span>' +
        (t.album ? '<span>' + escapeHtml(pick(t, 'album', 'albumEn')) + '</span>' : '') + '</div>' +
        (t.authorName ? '<div class="by">' + escapeHtml(window.__t ? window.__t('cc.by') : 'by') + ' ' + escapeHtml(t.authorName) + '</div>' : '') +
        (tags ? '<div class="tags">' + tags + '</div>' : '') +
        '</div>';
      card.addEventListener('click', function () { playFromQueue(i); });
      grid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- player ---------- */
  function playFromQueue(i) {
    if (i < 0 || i >= queue.length) return;
    currentIndex = i;
    var t = queue[i];
    var bar = document.getElementById('playerBar');
    bar.style.display = 'flex';
    var cover = document.getElementById('pbCover');
    cover.innerHTML = t.cover ? '<img src="' + t.cover + '" alt="">' : '♪';
    document.getElementById('pbTitle').textContent = pick(t, 'title', 'titleEn');
    document.getElementById('pbArtist').textContent = pick(t, 'artist', 'artistEn');
    audio.src = t.src;
    audio.play().catch(function () {});
    syncPlayBtn();
  }

  function syncPlayBtn() {
    var b = document.getElementById('pbPlay');
    b.textContent = audio.paused ? '▶' : '⏸';
  }

  function togglePlay() {
    if (currentIndex === -1) {
      if (queue.length) playFromQueue(0);
      return;
    }
    if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    syncPlayBtn();
  }

  function step(dir) {
    if (queue.length === 0) return;
    var n = (currentIndex + dir + queue.length) % queue.length;
    playFromQueue(n);
  }

  function initPlayer() {
    document.getElementById('pbPlay').addEventListener('click', togglePlay);
    document.getElementById('pbPrev').addEventListener('click', function () { step(-1); });
    document.getElementById('pbNext').addEventListener('click', function () { step(1); });
    audio.addEventListener('play', syncPlayBtn);
    audio.addEventListener('pause', syncPlayBtn);
    audio.addEventListener('ended', function () { step(1); });
    audio.addEventListener('timeupdate', function () {
      var d = audio.duration || 0, c = audio.currentTime || 0;
      document.getElementById('pbProgress').style.width = (d ? (c / d * 100) : 0) + '%';
      document.getElementById('pbCur').textContent = fmt(c);
      document.getElementById('pbDur').textContent = fmt(d);
    });
    document.getElementById('pbVol').addEventListener('input', function (e) {
      audio.volume = parseFloat(e.target.value);
    });
    var seek = document.getElementById('pbSeek');
    seek.addEventListener('click', function (e) {
      var rect = seek.getBoundingClientRect();
      var ratio = (e.clientX - rect.left) / rect.width;
      if (audio.duration) audio.currentTime = ratio * audio.duration;
    });
  }

  /* ---------- events ---------- */
  function initEvents() {
    qInput.addEventListener('input', renderGrid);
    document.getElementById('btnClear').addEventListener('click', function () {
      qInput.value = ''; activeTags = {}; renderChips(); renderGrid();
    });
    var seg = document.getElementById('sortSeg');
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      sortMode = b.getAttribute('data-s');
      [].forEach.call(seg.querySelectorAll('button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      renderGrid();
    });
    var sseg = document.getElementById('srcSeg');
    if (sseg) sseg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      setSource(b.getAttribute('data-src'));
    });
    // re-render on language change
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-lang-toggle]')) {
        setTimeout(renderGrid, 0);
      }
    });
  }

  /* ---------- data sources ---------- */
  function loadLibrary() {
    fetch(TRACKS_URL).then(function (r) { return r.json(); }).then(function (data) {
      tracks = (data && data.tracks) || [];
      renderChips();
      renderGrid();
    }).catch(function (e) {
      empty.style.display = 'block';
      empty.textContent = '无法加载 tracks.json：' + e;
    });
  }

  function loadCommunity() {
    fetch('/api/tracks').then(function (r) { return r.json(); }).then(function (data) {
      tracks = (data && data.tracks) || [];
      renderChips();
      renderGrid();
    }).catch(function () {
      empty.style.display = 'block';
      empty.textContent = '社区作品加载失败，请稍后重试。';
    });
  }

  function setSource(s) {
    source = s;
    var sseg = document.getElementById('srcSeg');
    if (sseg) [].forEach.call(sseg.querySelectorAll('button'), function (x) {
      x.classList.toggle('on', x.getAttribute('data-src') === s);
    });
    if (s === 'community') loadCommunity(); else loadLibrary();
  }

  /* ---------- boot ---------- */
  function boot() {
    initThemeBtn();
    initPlayer();
    initEvents();
    var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
    if (source === 'community') loadCommunity(); else loadLibrary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
