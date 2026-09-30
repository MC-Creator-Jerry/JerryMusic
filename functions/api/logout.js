// ============================================================
//  jerrymusic-site / functions/api/logout.js  —— 会员登出
//  POST /api/logout  -> 清 jm_uid 会话（不影响小蓝页本身登录态）
// ============================================================

import { destroySession, clearSessionCookie, json } from '../_lib/jmauth.js';

export async function onRequestPost(context) {
  try {
    await destroySession(context);
  } catch (e) {
    /* 忽略 */
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
