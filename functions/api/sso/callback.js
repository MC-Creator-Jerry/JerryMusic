// ============================================================
//  jerrymusic-site / functions/api/sso/callback.js  —— 登录回调
//  GET /api/sso/callback?code=&state=
//  用一次性 code 向小蓝页换身份（服务端到服务端），成功后在本域种 jm_uid。
// ============================================================

import {
  getCookie,
  SSO_COOKIE,
  createSession,
  sessionCookie,
  clearSsoStateCookie,
  IDP,
  CLIENT_ID,
} from '../../_lib/jmauth.js';

function safeNext(v) {
  const s = String(v || '');
  if (!s || s[0] !== '/' || s[1] === '/' || s.indexOf('\\') >= 0) return '/';
  return s;
}

function redirect(location, cookies) {
  const h = new Headers();
  (cookies || []).forEach((c) => h.append('set-cookie', c));
  h.set('location', location);
  h.set('cache-control', 'no-store');
  return new Response(null, { status: 302, headers: h });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const kv = context.env.JERRYMUSIC_KV;

  if (!code || !state) return redirect('/?sso=bad_params', [clearSsoStateCookie()]);
  if (!kv) return redirect('/?sso=not_ready', [clearSsoStateCookie()]);

  // state 双校验：HttpOnly Cookie + KV 记录，缺一不可（防 CSRF / 伪造回调）
  const cookieState = getCookie(context.request, SSO_COOKIE);
  if (!cookieState || cookieState !== state) {
    return redirect('/?sso=bad_state', [clearSsoStateCookie()]);
  }

  let rec = null;
  try {
    rec = await kv.get('jm:sso:state:' + state, { type: 'json' });
  } catch (e) {
    rec = null;
  }
  if (!rec) return redirect('/?sso=bad_state', [clearSsoStateCookie()]);
  try {
    await kv.delete('jm:sso:state:' + state);
  } catch (e) {
    /* 忽略 */
  }

  const secret = context.env.SSO_CLIENT_SECRET;
  if (!secret) return redirect('/?sso=not_configured', [clearSsoStateCookie()]);

  let d = null;
  try {
    // 密钥走 body，不要走 Authorization header。
    // 原因：Pages 的 secret 在写入过程中可能混入不可见字符（如换行），
    // 放进 header 会触发 "Invalid header value" 而让整次换码失败；
    // JSON body 对这类字符是安全的，且 IdP 的 token 端点支持 client_secret。
    const r = await fetch(IDP + '/api/sso/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        client_id: CLIENT_ID,
        client_secret: secret,
      }),
    });
    const j = await r.json();
    if (r.ok && j && j.ok) d = j;
  } catch (e) {
    d = null;
  }

  if (!d) return redirect('/?sso=token_failed', [clearSsoStateCookie()]);

  const sid = await createSession(kv, {
    sub: d.sub,
    login: d.login,
    name: d.name,
    avatar_url: d.avatar_url,
    isAdmin: !!d.isAdmin,
    provider: d.provider || 'xiaolan',
  });

  const next = safeNext(rec.next);
  return redirect(next, [sessionCookie(sid, 60 * 60 * 24 * 30), clearSsoStateCookie()]);
}
