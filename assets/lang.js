/* JerryMusic —— 中英双语引擎（复用片屿 xl_lang 约定） */
(function () {
  var LS_KEY = 'jm_lang';

  function getLang() {
    try { return localStorage.getItem(LS_KEY) === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }

  var DIC = {
    'nav.home': { zh: '首页', en: 'Home' },
    'nav.about': { zh: '关于', en: 'About' },
    'theme.toggle': { zh: '切换明暗', en: 'Toggle theme' },
    'search.placeholder': { zh: '搜索歌名 / 艺人 / 标签…', en: 'Search title / artist / tags…' },
    'sort.newest': { zh: '最新', en: 'Latest' },
    'sort.title': { zh: '歌名', en: 'A–Z' },
    'btn.clear': { zh: '清空', en: 'Clear' },
    'empty': { zh: '曲库还是空的 —— 往 tracks.json 里加第一首歌吧。', en: 'The library is empty — add your first track to tracks.json.' },
    'footer.tagline': { zh: '独立站点 · 独立后端（Cloudflare Pages + Functions）', en: 'Independent site · own backend (Cloudflare Pages + Functions)' },
    'hero.title': { zh: 'JerryMusic · 音乐小岛', en: 'JerryMusic · Music Island' },
    'hero.desc': { zh: '一座收藏与分享音乐的小岛。听歌、建歌单、把喜欢的旋律留给同好。', en: 'A small island to collect and share music. Listen, build playlists, and keep your favorite tunes for friends.' },
    'about.title': { zh: '关于 JerryMusic', en: 'About JerryMusic' },
    'about.body': { zh: 'JerryMusic 是 Jerry 的个人音乐站，部署在 Cloudflare Pages，曲库以静态 tracks.json 维护，可随时增删。后续可接入 KV 与 Functions 做在线歌单管理。', en: 'JerryMusic is Jerry’s personal music site, hosted on Cloudflare Pages. The library is maintained as a static tracks.json and can be edited anytime. KV + Functions online playlist management may come later.' },
    'player.none': { zh: '选一首歌开始播放', en: 'Pick a track to start' },
    'player.prev': { zh: '上一首', en: 'Prev' },
    'player.next': { zh: '下一首', en: 'Next' },
    'player.play': { zh: '播放', en: 'Play' },
    'player.pause': { zh: '暂停', en: 'Pause' }
  };

  function t(k) {
    var d = DIC[k];
    if (!d) return k;
    var l = getLang();
    return d[l] != null ? d[l] : (d.zh != null ? d.zh : k);
  }

  var mo = null;
  function apply() {
    if (mo) mo.disconnect();
    var l = getLang();
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
    document.documentElement.setAttribute('data-lang', l);
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      var txt = t(k);
      if (txt != null) nodes[i].textContent = txt;
    }
    var phs = document.querySelectorAll('[data-i18n-ph]');
    for (var p = 0; p < phs.length; p++) {
      var pt = t(phs[p].getAttribute('data-i18n-ph'));
      if (pt != null) phs[p].setAttribute('placeholder', pt);
    }
    var tg = document.querySelectorAll('[data-lang-toggle]');
    for (var j = 0; j < tg.length; j++) {
      tg[j].textContent = l === 'en' ? '中文' : 'EN';
      tg[j].setAttribute('title', l === 'en' ? '切换到中文' : 'Switch to English');
    }
    if (mo) mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function setLang(l) {
    try { localStorage.setItem(LS_KEY, l); } catch (e) {}
    apply();
  }

  function observe() {
    if (!('MutationObserver' in window)) return;
    mo = new MutationObserver(function () { apply(); });
  }

  window.__t = t;
  window.__lang = getLang;
  window.__setLang = setLang;
  window.__applyLang = apply;

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-lang-toggle]') : null;
    if (el) { setLang(getLang() === 'en' ? 'zh' : 'en'); }
  });
  document.addEventListener('DOMContentLoaded', function () { observe(); apply(); });
  apply();
})();
