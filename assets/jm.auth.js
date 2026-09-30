/* ============================================================
   音乐电台 / assets/jm.auth.js
   小蓝页 SSO 前端：登录按钮 / 头像菜单（挂 #hdrRight）+ SSO 提示
   暴露 window.JM
   ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function t(k) {
    return (window.__t && window.__t(k)) || k;
  }

  function api(url, opts) {
    return fetch(url, opts || {}).then(function (r) { return r.json(); });
  }

  var JM = {
    _cached: undefined,

    async load(force) {
      if (!force && this._cached !== undefined) return this._cached;
      try {
        var d = await api('/api/me');
        this._cached = (d && d.ok && d.user) || null;
      } catch (e) {
        this._cached = null;
      }
      return this._cached;
    },

    initial(u) {
      var s = String((u && (u.name || u.login)) || '听').trim();
      return s ? s.slice(0, 1).toUpperCase() : '听';
    },

    loginUrl() {
      var next = location.pathname + location.search;
      return '/api/sso/start?next=' + encodeURIComponent(next);
    },

    async logout() {
      try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
      this._cached = null;
      location.reload();
    },

    async mount(slotId) {
      var slot = document.getElementById(slotId || 'hdrRight');
      if (!slot) return;
      var u = await this.load(true);
      var wrap = document.createElement('div');
      wrap.className = 'user-wrap';

      if (!u) {
        wrap.innerHTML =
          '<a class="login-btn" href="' + esc(this.loginUrl()) + '">' + esc(t('login.btn')) + '</a>';
        slot.appendChild(wrap);
        return;
      }

      var av = u.avatar_url
        ? '<img src="' + esc(u.avatar_url) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'fb\',textContent:\'' + esc(this.initial(u)) + '\'}))">'
        : '<span class="fb">' + esc(this.initial(u)) + '</span>';

      wrap.innerHTML =
        '<button class="avatar-btn" id="jmAvatarBtn" aria-haspopup="true" aria-expanded="false">' +
        av +
        '<span class="nm">' + esc(u.name || u.login || '听友') + '</span>' +
        '</button>' +
        '<div class="menu hide" id="jmUserMenu" role="menu">' +
        '<div class="hd"><div class="n">' + esc(u.name || u.login || '听友') +
        (u.isAdmin ? '<span class="badge">站长</span>' : '') +
        '</div><div class="l">' + esc(u.login ? '@' + u.login : '小蓝页账户') + '</div></div>' +
        '<div class="sep"></div>' +
        '<a role="menuitem" href="creator.html">创作者中心</a>' +
        '<div class="sep"></div>' +
        '<button role="menuitem" id="jmLogoutBtn">' + esc(t('login.logout')) + '</button>' +
        '</div>';

      slot.appendChild(wrap);

      var btn = wrap.querySelector('#jmAvatarBtn');
      var menu = wrap.querySelector('#jmUserMenu');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var hidden = menu.classList.toggle('hide');
        btn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      });
      document.addEventListener('click', function () {
        menu.classList.add('hide');
        btn.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          menu.classList.add('hide');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
      wrap.querySelector('#jmLogoutBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        JM.logout();
      });
    },
  };

  window.JM = JM;

  // SSO 回调带回的错误码 → 顶部提示条
  function showSsoNotice() {
    var code = new URLSearchParams(location.search).get('sso');
    if (!code) return;
    var map = {
      bad_params: '登录参数不完整，请重试。',
      bad_state: '登录校验失败（可能是链接过期），请重试。',
      not_ready: '站点尚未就绪，请稍后重试。',
      not_configured: '站点未配置登录密钥，请联系站长。',
      token_failed: '身份校验未通过，请重新登录。',
      ok: '',
    };
    var msg = map[code] !== undefined ? map[code] : '登录未完成。';
    if (!msg) return;

    var bar = document.createElement('div');
    bar.className = 'notice err';
    bar.style.maxWidth = '1180px';
    bar.style.margin = '14px auto -6px';
    bar.style.width = 'calc(100% - 40px)';
    bar.textContent = msg;
    var main = document.querySelector('main');
    if (main && main.parentNode) main.parentNode.insertBefore(bar, main);
    else document.body.appendChild(bar);
    setTimeout(function () { bar.remove(); }, 6000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    JM.mount('hdrRight');
    showSsoNotice();
  });
})();
