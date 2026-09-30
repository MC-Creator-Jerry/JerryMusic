/* 音乐电台 —— 中英双语引擎（复用片屿 xl_lang 约定） */
(function () {
  var LS_KEY = 'jm_lang';

  function getLang() {
    try { return localStorage.getItem(LS_KEY) === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }

  var DIC = {
    'nav.home': { zh: '首页', en: 'Home' },
    'nav.about': { zh: '关于', en: 'About' },
    'nav.creator': { zh: '创作者中心', en: 'Creator' },
    'theme.toggle': { zh: '切换明暗', en: 'Toggle theme' },
    'search.placeholder': { zh: '搜索歌名 / 艺人 / 标签…', en: 'Search title / artist / tags…' },
    'sort.newest': { zh: '最新', en: 'Latest' },
    'sort.title': { zh: '歌名', en: 'A–Z' },
    'btn.clear': { zh: '清空', en: 'Clear' },
    'src.library': { zh: '电台曲库', en: 'Library' },
    'src.community': { zh: '社区作品', en: 'Community' },
    'empty': { zh: '这里还没有内容 —— 去创作者中心发布第一首歌吧。', en: 'Nothing here yet — publish your first track in the Creator Center.' },
    'empty.library': { zh: '曲库还是空的 —— 往 tracks.json 里加第一首歌吧。', en: 'The library is empty — add your first track to tracks.json.' },
    'footer.tagline': { zh: '独立站点 · 独立后端（Cloudflare Pages + Functions）', en: 'Independent site · own backend (Cloudflare Pages + Functions)' },
    'hero.title': { zh: '音乐电台 · 收听每一段旋律', en: 'MusicRadio · Tune into every melody' },
    'hero.desc': { zh: '一座收藏与分享音乐的电台。登录后开通创作者中心，发布你自己的作品，让同好听见。', en: 'A radio to collect and share music. Sign in to open your Creator Center and publish your own tracks.' },
    'about.title': { zh: '关于 音乐电台', en: 'About MusicRadio' },
    'about.body': { zh: '音乐电台是 Jerry 的个人音乐站，部署在 Cloudflare Pages：电台曲库以静态 tracks.json 维护，社区作品由创作者中心（小蓝页账号登录）发布到 KV。', en: 'MusicRadio is Jerry’s personal music site on Cloudflare Pages. The library is a static tracks.json; community works are published via the Creator Center (sign in with your Xiaolan account) into KV.' },
    'player.none': { zh: '选一首歌开始播放', en: 'Pick a track to start' },
    'player.prev': { zh: '上一首', en: 'Prev' },
    'player.next': { zh: '下一首', en: 'Next' },
    'player.play': { zh: '播放', en: 'Play' },
    'player.pause': { zh: '暂停', en: 'Pause' },
    'login.btn': { zh: '用小蓝页登录', en: 'Sign in with Xiaolan' },
    'login.logout': { zh: '退出登录', en: 'Sign out' },
    'login.my': { zh: '我的作品', en: 'My Works' },
    'cc.title': { zh: '创作者中心', en: 'Creator Center' },
    'cc.sub': { zh: '用你的小蓝页账号登录，发布与你的音乐。', en: 'Sign in with your Xiaolan account to publish and manage your music.' },
    'cc.please': { zh: '请先登录以使用创作者中心', en: 'Please sign in to use the Creator Center' },
    'cc.add': { zh: '发布作品', en: 'Publish Track' },
    'cc.form.title': { zh: '歌名', en: 'Title' },
    'cc.form.artist': { zh: '艺人', en: 'Artist' },
    'cc.form.album': { zh: '专辑', en: 'Album' },
    'cc.form.tags': { zh: '标签（逗号分隔，最多 8 个）', en: 'Tags (comma separated, up to 8)' },
    'cc.form.src': { zh: '音频链接（https）', en: 'Audio URL (https)' },
    'cc.form.cover': { zh: '封面链接（https，可选）', en: 'Cover URL (https, optional)' },
    'cc.form.submit': { zh: '发布', en: 'Publish' },
    'cc.form.cancel': { zh: '取消', en: 'Cancel' },
    'cc.empty': { zh: '你还没有发布作品。', en: 'You haven’t published anything yet.' },
    'cc.by': { zh: '由', en: 'by' }
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
