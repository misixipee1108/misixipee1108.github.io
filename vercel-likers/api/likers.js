// api/likers.js — 点赞者登记与查询（Vercel Serverless + Vercel KV）
// 部署：放入现有 Waline 项目的 api/ 目录（或独立 Vercel 项目），
//       创建 Vercel KV 存储并设置环境变量 KV_REST_API_URL / KV_REST_API_TOKEN。
// 接口：
//   GET  /api/likers?path=/文章路径/   → { errno:0, data: [{ id, nick, avatar, time }] }
//   POST /api/likers                  → body: { path, nick, mail, uid, action:'add'|'remove' }
//         action='add'   登记/更新当前访客为该文章点赞者
//         action='remove' 移除当前访客
// 说明：点赞者身份由 uid（邮箱 md5 或客户端匿名 id）去重；
//       头像由邮箱在服务端计算（cravatar 国内可达），匿名者使用站内默认头像。

const { createHash } = require('node:crypto');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX = 30; // 每篇文章最多保留的点赞者数

function md5(s) {
  return createHash('md5').update(String(s)).digest('hex');
}

function json(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return j.result;
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return false;
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  return r.ok;
}

module.exports = async function likers(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const url = new URL(req.url, 'http://localhost');

  // POST 时 path 在请求体内（客户端格式）；GET 时在 query 中
  let body = {};
  if (req.method === 'POST') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) { /* ignore */ }
  }
  const path = String(url.searchParams.get('path') || body.path || '').slice(0, 300);

  if (req.method === 'GET') {
    if (!path) return json(res, 400, { errno: 1, msg: 'path required' });
    const list = (await kvGet('likers:' + path)) || [];
    return json(res, 200, { errno: 0, data: list.slice(0, MAX) });
  }

  if (req.method === 'POST') {
    if (!path) return json(res, 400, { errno: 1, msg: 'path required' });

    const nick = String(body.nick || '').slice(0, 40);
    const mail = String(body.mail || '').toLowerCase().slice(0, 120);
    const uid = String(body.uid || '').slice(0, 60);
    const action = body.action === 'remove' ? 'remove' : 'add';
    const key = 'likers:' + path;
    const list = (await kvGet(key)) || [];

    // 身份：有邮箱用邮箱；否则用客户端匿名 id（需持久，用于去重）
    const id = mail || uid;
    if (!id) return json(res, 200, { errno: 0, data: list.length });

    if (action === 'remove') {
      const next = list.filter((x) => x.id !== id);
      await kvSet(key, next);
      return json(res, 200, { errno: 0, data: next.length });
    }

    const entry = {
      id,
      nick: nick || '匿名访客',
      avatar: mail ? `https://cravatar.cn/avatar/${md5(mail)}?d=retro` : '',
      time: Date.now(),
    };
    const next = [entry, ...list.filter((x) => x.id !== id)].slice(0, MAX);
    await kvSet(key, next);
    return json(res, 200, { errno: 0, data: next.length });
  }

  return json(res, 405, { errno: 1, msg: 'method not allowed' });
};
