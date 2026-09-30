// ============================================================
//  jerrymusic-site / functions/api/tracks.js  —— 社区作品（创作者中心）
//
//  KV 键（JERRYMUSIC_KV）：
//    jmtrack:<id>        -> JSON 单条作品
//    jmtrack:index       -> JSON 全站作品 id 数组（公开列表用）
//    jmtrack:by:<sub>    -> JSON 该作者作品 id 数组（我的作品用）
//
//  路由：
//    GET  /api/tracks          公开：列出全站社区作品（按 addedAt 倒序）
//    GET  /api/tracks?mine=1   登录：列出「我的作品」
//    POST /api/tracks          登录：发布作品（音频走外链 URL，免 R2/绑卡）
//    PUT  /api/tracks?id=<id>  登录 + 仅作者：编辑
//    DELETE /api/tracks?id=<id> 登录 + 仅作者：删除
// ============================================================

import { getSession, json, randomId } from '../_lib/jmauth.js';

const KV = () => null; // placeholder, real kv from context

function kvOf(context) {
  return context.env.JERRYMUSIC_KV;
}

// 只允许 https 外链（杜绝 javascript:/data:/相对协议等）
function isHttpsUrl(s) {
  try {
    const u = new URL(String(s).trim());
    return u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function normTags(v) {
  let arr = [];
  if (typeof v === 'string') {
    arr = v.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(v)) {
    arr = v.map((s) => String(s).trim()).filter(Boolean);
  }
  // 去重 + 限 8 个 + 每标签限 24 字
  const seen = new Set();
  const out = [];
  for (const t of arr) {
    const x = t.slice(0, 24);
    const k = x.toLowerCase();
    if (x && !seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function str(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

async function readIndex(kv, key) {
  try {
    const raw = await kv.get(key, { type: 'json' });
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

async function writeIndex(kv, key, arr) {
  await kv.put(key, JSON.stringify(arr));
}

export async function onRequestGet(context) {
  const kv = kvOf(context);
  const url = new URL(context.request.url);
  const mine = url.searchParams.get('mine') === '1';

  if (mine) {
    const sess = await getSession(context);
    if (!sess || !sess.sub) return json({ ok: false, error: 'unauthorized' }, 401);
    const ids = await readIndex(kv, 'jmtrack:by:' + sess.sub);
    const tracks = [];
    for (const id of ids) {
      const t = await readOne(kv, id);
      if (t) tracks.push(t);
    }
    tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    return json({ ok: true, tracks });
  }

  const ids = await readIndex(kv, 'jmtrack:index');
  const tracks = [];
  for (const id of ids) {
    const t = await readOne(kv, id);
    if (t) tracks.push(t);
  }
  tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  return json({ ok: true, tracks });
}

async function readOne(kv, id) {
  try {
    const raw = await kv.get('jmtrack:' + id, { type: 'json' });
    return raw || null;
  } catch (e) {
    return null;
  }
}

export async function onRequestPost(context) {
  const kv = kvOf(context);
  const sess = await getSession(context);
  if (!sess || !sess.sub) return json({ ok: false, error: 'unauthorized' }, 401);

  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const title = str(body.title, 120);
  const src = str(body.src, 2000);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);
  if (!isHttpsUrl(src)) return json({ ok: false, error: 'src_https_required' }, 400);

  const cover = str(body.cover, 2000);
  if (cover && !isHttpsUrl(cover)) return json({ ok: false, error: 'cover_https_required' }, 400);

  const id = randomId(10);
  const now = Date.now();
  const rec = {
    id,
    title,
    titleEn: str(body.titleEn, 120),
    artist: str(body.artist, 120),
    artistEn: str(body.artistEn, 120),
    album: str(body.album, 160),
    tags: normTags(body.tags),
    src,
    cover: cover || '',
    authorSub: sess.sub,
    authorLogin: sess.login || '',
    authorName: sess.name || sess.login || '听友',
    addedAt: now,
    updatedAt: now,
  };

  await kv.put('jmtrack:' + id, JSON.stringify(rec));
  const globalIdx = await readIndex(kv, 'jmtrack:index');
  globalIdx.unshift(id);
  await writeIndex(kv, 'jmtrack:index', globalIdx);
  const byIdx = await readIndex(kv, 'jmtrack:by:' + sess.sub);
  byIdx.unshift(id);
  await writeIndex(kv, 'jmtrack:by:' + sess.sub, byIdx);

  return json({ ok: true, track: rec }, 201);
}

export async function onRequestPut(context) {
  const kv = kvOf(context);
  const sess = await getSession(context);
  if (!sess || !sess.sub) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(context.request.url);
  const id = str(url.searchParams.get('id'), 64);
  if (!id) return json({ ok: false, error: 'id_required' }, 400);

  const existing = await readOne(kv, id);
  if (!existing) return json({ ok: false, error: 'not_found' }, 404);
  if (existing.authorSub !== sess.sub) return json({ ok: false, error: 'forbidden' }, 403);

  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const title = str(body.title, 120);
  const src = str(body.src, 2000);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);
  if (!isHttpsUrl(src)) return json({ ok: false, error: 'src_https_required' }, 400);
  const cover = str(body.cover, 2000);
  if (cover && !isHttpsUrl(cover)) return json({ ok: false, error: 'cover_https_required' }, 400);

  const rec = Object.assign({}, existing, {
    title,
    titleEn: str(body.titleEn, 120),
    artist: str(body.artist, 120),
    artistEn: str(body.artistEn, 120),
    album: str(body.album, 160),
    tags: normTags(body.tags),
    src,
    cover: cover || '',
    updatedAt: Date.now(),
  });
  await kv.put('jmtrack:' + id, JSON.stringify(rec));
  return json({ ok: true, track: rec });
}

export async function onRequestDelete(context) {
  const kv = kvOf(context);
  const sess = await getSession(context);
  if (!sess || !sess.sub) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(context.request.url);
  const id = str(url.searchParams.get('id'), 64);
  if (!id) return json({ ok: false, error: 'id_required' }, 400);

  const existing = await readOne(kv, id);
  if (!existing) return json({ ok: false, error: 'not_found' }, 404);
  if (existing.authorSub !== sess.sub) return json({ ok: false, error: 'forbidden' }, 403);

  await kv.delete('jmtrack:' + id);
  const globalIdx = (await readIndex(kv, 'jmtrack:index')).filter((x) => x !== id);
  await writeIndex(kv, 'jmtrack:index', globalIdx);
  const byIdx = (await readIndex(kv, 'jmtrack:by:' + sess.sub)).filter((x) => x !== id);
  await writeIndex(kv, 'jmtrack:by:' + sess.sub, byIdx);

  return json({ ok: true });
}

export async function onRequest(context) {
  const m = context.request.method;
  if (m === 'GET') return onRequestGet(context);
  if (m === 'POST') return onRequestPost(context);
  if (m === 'PUT') return onRequestPut(context);
  if (m === 'DELETE') return onRequestDelete(context);
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
