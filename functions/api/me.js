// ============================================================
//  jerrymusic-site / functions/api/me.js  —— 当前会员
//  GET /api/me  -> { ok, user }  (未登录 user = null)
// ============================================================

import { getSession, publicProfile, json } from '../_lib/jmauth.js';

export async function onRequestGet(context) {
  let sess = null;
  try {
    sess = await getSession(context);
  } catch (e) {
    sess = null;
  }
  if (!sess) return json({ ok: true, user: null });
  const user = publicProfile(sess);
  return json({ ok: true, user });
}
