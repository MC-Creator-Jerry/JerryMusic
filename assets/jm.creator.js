/* ============================================================
   音乐电台 / assets/jm.creator.js
   创作者中心：登录门槛 + 我的作品（增 / 改 / 删）
   ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(k) { return (window.__t && window.__t(k)) || k; }

  function api(url, opts) {
    return fetch(url, opts || {}).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); });
  }

  var editingId = '';

  function byId(id) { return document.getElementById(id); }

  function renderProfile(u) {
    var el = byId('ccProfile');
    var av = u.avatar_url
      ? '<img src="' + esc(u.avatar_url) + '" alt="">'
      : '<span class="fb">' + esc((u.name || u.login || '听').slice(0, 1).toUpperCase()) + '</span>';
    el.innerHTML =
      '<div class="cc-av">' + av + '</div>' +
      '<div class="cc-id"><div class="n">' + esc(u.name || u.login || '听友') +
      (u.isAdmin ? '<span class="badge">站长</span>' : '') + '</div>' +
      '<div class="l">' + esc(u.login ? '@' + u.login : '小蓝页账户') + '</div></div>' +
      '<div class="spacer"></div>' +
      '<a class="btn" href="index.html">返回电台</a>' +
      '<button class="btn" id="ccLogout">' + esc(t('login.logout')) + '</button>';
    byId('ccLogout').addEventListener('click', function () { window.JM.logout(); });
  }

  function loadMyTracks() {
    api('/api/tracks?mine=1').then(function (res) {
      var tracks = (res.ok && res.data && res.data.tracks) || [];
      renderList(tracks);
    }).catch(function () { renderList([]); });
  }

  function renderList(tracks) {
    var list = byId('ccList');
    var empty = byId('ccEmpty');
    list.innerHTML = '';
    if (!tracks.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tracks.forEach(function (tr) {
      var item = document.createElement('div');
      item.className = 'cc-item';
      var tags = (tr.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
      item.innerHTML =
        '<div class="cc-item-main">' +
        '<div class="t">' + esc(tr.title) + (tr.titleEn ? ' <span class="en">· ' + esc(tr.titleEn) + '</span>' : '') + '</div>' +
        '<div class="m">' + esc(tr.artist || '') + (tr.album ? ' · ' + esc(tr.album) : '') + '</div>' +
        (tags ? '<div class="tags">' + tags + '</div>' : '') +
        '</div>' +
        '<audio class="cc-audio" controls preload="none" src="' + esc(tr.src) + '"></audio>' +
        '<div class="cc-item-actions">' +
        '<button class="btn small" data-edit="' + esc(tr.id) + '">编辑</button>' +
        '<button class="btn small danger" data-del="' + esc(tr.id) + '">删除</button>' +
        '</div>';
      list.appendChild(item);
    });

    list.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { startEdit(b.getAttribute('data-edit')); });
    });
    list.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { doDelete(b.getAttribute('data-del')); });
    });
  }

  function startEdit(id) {
    api('/api/tracks?mine=1').then(function (res) {
      var tracks = (res.ok && res.data && res.data.tracks) || [];
      var tr = tracks.find(function (x) { return x.id === id; });
      if (!tr) return;
      byId('f_id').value = tr.id;
      byId('f_title').value = tr.title || '';
      byId('f_artist').value = tr.artist || '';
      byId('f_album').value = tr.album || '';
      byId('f_tags').value = (tr.tags || []).join(', ');
      byId('f_src').value = tr.src || '';
      byId('f_cover').value = tr.cover || '';
      byId('f_submit').textContent = t('cc.form.submit') + '（' + t('cc.form.cancel') + '）';
      setMsg('');
      byId('ccForm').scrollIntoView({ behavior: 'smooth' });
    });
  }

  function doDelete(id) {
    if (!confirm('确定删除这首作品？')) return;
    api('/api/tracks?id=' + encodeURIComponent(id), { method: 'DELETE' }).then(function (res) {
      if (res.ok) { loadMyTracks(); }
      else { setMsg(res.data && res.data.error ? res.data.error : '删除失败'); }
    }).catch(function () { setMsg('网络错误'); });
  }

  function setMsg(s) {
    var m = byId('ccMsg');
    m.textContent = s || '';
    m.className = 'cc-msg' + (s ? ' err' : '');
  }

  function resetForm() {
    editingId = '';
    byId('f_id').value = '';
    ['f_title', 'f_artist', 'f_album', 'f_tags', 'f_src', 'f_cover'].forEach(function (k) { byId(k).value = ''; });
    byId('f_submit').textContent = t('cc.form.submit');
    setMsg('');
  }

  function wireForm() {
    byId('f_cancel').addEventListener('click', resetForm);
    byId('ccForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = byId('f_id').value;
      var body = {
        title: byId('f_title').value.trim(),
        artist: byId('f_artist').value.trim(),
        album: byId('f_album').value.trim(),
        tags: byId('f_tags').value.trim(),
        src: byId('f_src').value.trim(),
        cover: byId('f_cover').value.trim(),
      };
      if (!body.title) { setMsg(t('cc.form.title') + ' 必填'); return; }
      if (!body.src) { setMsg(t('cc.form.src') + ' 必填'); return; }

      var p;
      if (id) p = api('/api/tracks?id=' + encodeURIComponent(id), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      else p = api('/api/tracks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

      p.then(function (res) {
        if (res.ok) {
          resetForm();
          loadMyTracks();
        } else {
          var err = (res.data && res.data.error) || '失败';
          var zh = {
            unauthorized: '请先登录', title_required: '歌名必填', src_https_required: '音频链接必须是 https',
            cover_https_required: '封面链接必须是 https', forbidden: '无权修改', not_found: '作品不存在', bad_request: '请求格式错误'
          }[err] || err;
          setMsg(zh);
        }
      }).catch(function () { setMsg('网络错误'); });
    });
  }

  function boot() {
    var yr = byId('yr'); if (yr) yr.textContent = new Date().getFullYear();
    wireForm();
    var login = byId('ccLogin');
    if (login) login.href = window.JM.loginUrl();

    window.JM.load(true).then(function (u) {
      if (!u) {
        byId('ccGate').classList.remove('hide');
        byId('ccMain').classList.add('hide');
        return;
      }
      byId('ccGate').classList.add('hide');
      byId('ccMain').classList.remove('hide');
      renderProfile(u);
      loadMyTracks();
    }).catch(function () {
      byId('ccGate').classList.remove('hide');
      byId('ccMain').classList.add('hide');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
