// ============================================================
//  jerrymusic-site / functions/api/sso/start.js  —— 登录起点
//  GET /api/sso/start?next=/creator.html
//  生成一次性 state（KV 10 分钟 + HttpOnly Cookie 双保险），302 到小蓝页授权端点。
// ============================================================

import { randomId, ssoStateCookie, IDP, CLIENT_ID } from '../../_lib/jmauth.js';

function safeNext(v) {
  const s = String(v || '');
  // 只允许本站绝对路径，杜绝开放重定向
  if (!s || s[0] !== '/' || s[1] === '/' || s.indexOf('\\') >= 0) return '/';
  return s;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const next = safeNext(url.searchParams.get('next'));
  const state = randomId(16);

  const redirectUri = url.origin + '/api/sso/callback';

  const kv = context.env.JERRYMUSIC_KV;
  if (kv) {
    try {
      await kv.put('jm:sso:state:' + state, JSON.stringify({ ts: Date.now(), next: next }), {
        expirationTtl: 600,
      });
    } catch (e) {
      /* KV 不可用时仍继续：callback 会因 state 缺失而拒绝 */
    }
  }

  const target =
    IDP +
    '/api/sso/authorize' +
    '?client_id=' +
    encodeURIComponent(CLIENT_ID) +
    '&redirect_uri=' +
    encodeURIComponent(redirectUri) +
    '&state=' +
    encodeURIComponent(state);

  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      'set-cookie': ssoStateCookie(state, 600),
      'cache-control': 'no-store',
    },
  });
}
