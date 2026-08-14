/**
 * 点赞者头像墙 — 在 Waline 👍 反应旁显示点赞者头像列表
 * ------------------------------------------------------------------
 * · 后端：Vercel Serverless（见仓库 vercel-likers/），Vercel KV 持久化；
 *   前端 API 地址由 comments.html 注入 window.DSH_LIKERS_API
 * · 点赞时登记当前访客（昵称/邮箱来自 Waline 的 WALINE_USER_META；
 *   匿名访客用本地持久化 uid 去重）
 * · 头像：邮箱由服务端算 cravatar；匿名/失败自动兜底为站内默认头像
 * · 后端不可用时静默隐藏，不影响任何现有功能
 * · 纯装饰（aria-hidden），仅受站点动效开关（html.motion-off）控制
 */
(function () {
  'use strict';

  var API = (window.DSH_LIKERS_API || '').trim();
  var box = document.querySelector('#waline');
  if (!API || !box) return;

  var html = document.documentElement;
  // Waline 的路径使用解码后的形式（localStorage 键 / API path 均一致），
  // 而 location.pathname 是百分号编码形式，需解码后对齐
  var path = (function () {
    try { return decodeURIComponent(window.location.pathname); }
    catch (e) { return window.location.pathname; }
  })();
  var DEFAULT_AVATAR = '/images/avatar-default.svg';

  var wall = null;
  var available = false;
  var lastLiked = null;

  function readMeta() {
    try {
      var m = JSON.parse(localStorage.getItem('WALINE_USER_META') || '{}');
      return { nick: m.nick || '', mail: String(m.mail || '').toLowerCase() };
    } catch (e) {
      return { nick: '', mail: '' };
    }
  }

  function getUid() {
    var key = 'DSH_LIKER_UID';
    var v = localStorage.getItem(key);
    if (!v) {
      v = 'anon-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(key, v);
    }
    return v;
  }

  function likedNow() {
    try {
      var store = JSON.parse(localStorage.getItem('WALINE_REACTION') || '{}');
      return store[path] !== undefined;
    } catch (e) {
      return false;
    }
  }

  function post(action) {
    var meta = readMeta();
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, nick: meta.nick, mail: meta.mail, uid: getUid(), action: action }),
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function ensureWall() {
    if (wall) return wall;
    var reactionList = box.querySelector('.wl-reaction-list');
    if (!reactionList) return null;
    wall = document.createElement('div');
    wall.className = 'wl-reaction-likers';
    wall.setAttribute('aria-hidden', 'true');
    reactionList.parentNode.insertBefore(wall, reactionList.nextSibling);
    return wall;
  }

  function render(list) {
    var el = ensureWall();
    if (!el) return;
    el.innerHTML = '';

    var avatars = document.createElement('span');
    avatars.className = 'wl-reaction-likers__avatars';
    list.slice(0, 8).forEach(function (u) {
      var img = document.createElement('img');
      img.className = 'wl-reaction-likers__avatar';
      img.alt = u.nick || '';
      img.title = u.nick || '';
      img.loading = 'lazy';
      img.src = u.avatar || DEFAULT_AVATAR;
      img.onerror = function () { img.onerror = null; img.src = DEFAULT_AVATAR; };
      avatars.appendChild(img);
    });
    el.appendChild(avatars);

    if (list.length > 8) {
      var count = document.createElement('span');
      count.className = 'wl-reaction-likers__count';
      count.textContent = '+' + (list.length - 8);
      el.appendChild(count);
    }
    el.classList.add('is-visible');
  }

  function refresh() {
    fetch(API + '?path=' + encodeURIComponent(path))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('bad status')); })
      .then(function (j) {
        if (!j || j.errno !== 0) throw new Error('bad payload');
        available = true;
        render(j.data || []);
      })
      .catch(function () {
        available = false;
        if (wall) wall.classList.remove('is-visible');
      });
  }

  /* 点赞/取消 → 登记/移除 → 刷新头像墙。
     注意：Waline 要等服务端反应 POST 完成才更新 localStorage（冷启动可能数秒），
     因此不等待其异步写入，而是按"点击前状态必然翻转"同步判定。 */
  box.addEventListener('click', function (e) {
    if (!e.target.closest('.wl-reaction-item')) return;
    var wasLiked = likedNow();        // 点击前的点赞状态（Waline 已完成的上一次写入）
    var willLike = !wasLiked;         // 单击 👍 必然翻转（本组件仅一个反应项）
    post(willLike ? 'add' : 'remove').then(function () {
      if (available) refresh();
    });
  }, true);

  /* Waline 异步渲染后确保头像墙容器存在 */
  new MutationObserver(function () {
    if (available) ensureWall();
  }).observe(box, { childList: true, subtree: true });

  /* 初始：后端可用则展示；当前访客若已点赞则补登记一次（服务端按 uid 去重） */
  lastLiked = likedNow();
  refresh();
  if (lastLiked) post('add');
})();
