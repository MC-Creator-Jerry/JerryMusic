// ============================================================
//  jerrymusic-site / functions/_lib/jmauth.js
//  音乐电台会员会话库（JERRYMUSIC_KV）· 身份来源＝小蓝页 SSO
//
//  pages.dev 在公共后缀名单里，jerrymusic.pages.dev 与小蓝页属不同站点，
//  Cookie 无法跨子域共享，只能「小蓝页签一次性 code → 本站服务端换码 →
//  在 jerrymusic 域下种自己的会话」。
//
//  KV 键：
//    jmsess:<sid>      -> JSON 会员会话档案（30 天）
//    jm:sso:state:<s>  -> JSON { ts, next }  一次性 state（10 分钟，防 CSRF）
//    其余业务键见 tracks.js
// ============================================================

export const COOKIE = 'jm_uid';
export const SSO_COOKIE = 'jm_sso';

export const IDP = 'https://mc-creator-jerry-webpage.pages.dev';
export const CLIENT_ID = 'jerrymusic';
export const REDIRECT_URI = 'https://jerrymusic.pages.dev/api/sso/callback';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 天

/* ---------------- cookies ---------------- */

export function getCookie(req, name) {
  const h = req.headers.get('cookie');
  if (!h) return null;
  const m = h
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

export function randomId(bytes) {
  const n = bytes || 24;
  const a = new Uint8Array(n);
  (globalThis.crypto || crypto).getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
  return s;
}

export function sessionCookie(sid, maxAge) {
  return COOKIE + '=' + sid + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}

export function clearSessionCookie() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export function ssoStateCookie(state, maxAge) {
  return SSO_COOKIE + '=' + state + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}

export function clearSsoStateCookie() {
  return SSO_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

/* ---------------- json 助手 ---------------- */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/* ---------------- session ---------------- */

// profile: { sub, login, name, avatar_url, isAdmin, provider }
export async function createSession(kv, profile) {
  const sid = randomId(24);
  const rec = Object.assign({ ts: Date.now() }, profile);
  await kv.put('jmsess:' + sid, JSON.stringify(rec), { expirationTtl: SESSION_TTL });
  return sid;
}

export async function getSession(context) {
  const kv = context.env.JERRYMUSIC_KV;
  if (!kv) return null;
  const sid = getCookie(context.request, COOKIE);
  if (!sid) return null;
  let raw = null;
  try {
    raw = await kv.get('jmsess:' + sid);
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function destroySession(context) {
  const kv = context.env.JERRYMUSIC_KV;
  const sid = getCookie(context.request, COOKIE);
  if (kv && sid) {
    try {
      await kv.delete('jmsess:' + sid);
    } catch (e) {
      /* 忽略 */
    }
  }
}

// 给前端用的公开档案
export function publicProfile(sess) {
  if (!sess) return null;
  return {
    sub: sess.sub || null,
    login: sess.login || '',
    name: sess.name || sess.login || '听友',
    avatar_url: sess.avatar_url || '',
    isAdmin: !!sess.isAdmin,
    provider: sess.provider || 'xiaolan',
  };
}

// 要求已登录，否则返回 null（调用方自行决定 401/重定向）
export async function requireSession(context) {
  const s = await getSession(context);
  return s && s.sub ? s : null;
}
