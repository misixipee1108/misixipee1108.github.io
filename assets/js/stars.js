/**
 * 背景星点与粒子系统 — 太空时代复古未来主义
 * ------------------------------------------------------------------
 * 粒子种类（全部 Canvas 2D，无 WebGL）：
 *  1. 四角星形背景星：半透明、缓慢闪烁，随页面滚动产生视差，
 *     并持续缓慢漂移（出界随机重生），星座图案不断演化
 *  2. 星座连线：相邻背景星之间的极淡连线，缓慢呼吸（星图/航行图）
 *  3. 视差星层：多层微小星点以不同速度横向漂移，营造纵深
 *  4. 雷达涟漪：偶发扩散的细线圆环，如雷达扫描脉冲
 *  5. 上升星尘：光点上浮 + 摆动 + 呼吸（火箭余烬）
 *  6. 飘落尘屑：稀疏微粒缓慢沉降（与上升星尘形成纵深反差）
 *  7. 偶发流星：细线斜向划过，淡入淡出（低频缓慢）
 * ------------------------------------------------------------------
 * · 仅受站点动效开关（html.motion-off）控制；标签页隐藏时暂停
 * · 低电量模式：电池 ≤20% 且未充电时各层数量减半、暂停涟漪/流星
 * · 配色实时读取 CSS 变量，随明暗主题自动切换
 * · 调试钩子：window.__bgfx 暴露各粒子层数量与低电量状态
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var PARALLAX = 0.12;   // 星座随滚动的视差系数
  var LINK_TH = 230;     // 星座连线距离阈值（密度）
  var LINK_A = 0.22;     // 星座连线透明度上限（密度）

  var W = 0, H = 0, dpr = 1;
  var stars = [], motes = [], field = [], dust = [];
  var ripples = [], rippleWait = 0;
  var meteor = null, meteorWait = 0;
  var running = false, raf = 0, lastT = 0;
  var reduced = false;   // 低电量降级
  var palette = {};

  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  var isMotionOff = function () { return html.classList.contains('motion-off'); };
  var wrapY = function (y) { return ((y % H) + H) % H; };

  /* ---------- 主题配色（跟随 CSS 变量） ---------- */
  function readPalette() {
    var cs = getComputedStyle(html);
    var g = function (v) { return cs.getPropertyValue(v).trim(); };
    palette = {
      yellow: g('--yellow') || '#E4B83D',
      sky: g('--sky') || '#9CCFD1',
      orange: g('--orange') || '#E47739',
      accent: g('--accent') || '#B83B32',
      chrome: g('--chrome') || '#B9C5C3',
    };
  }

  /* ---------- 场景初始化 ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initField();
  }

  function initField() {
    var k = reduced ? 0.5 : 1;   // 低电量降级系数
    var small = W < 640, mid = W < 1100;

    /* 1. 四角星：漂移 + 滚动视差（密度提升） */
    var starCount = W >= 1400 ? 14 : (W >= 1100 ? 11 : (W >= 960 ? 8 : 0));
    starCount = Math.round(starCount * k);
    var gutter = Math.max(24, (W - 1088) / 2);
    var edgeX = function () {
      return Math.random() < 0.65
        ? (Math.random() < 0.5 ? rand(10, gutter * 0.9) : W - rand(10, gutter * 0.9))
        : rand(0, W);
    };
    stars = [];
    for (var i = 0; i < starCount; i++) {
      stars.push({
        x: edgeX(),
        y: rand(H * 0.05, H * 0.95),
        r: rand(2.4, 5.2),
        vx: rand(-0.02, 0.02),          // 缓慢随机漂移 → 星座不断演化
        vy: rand(-0.016, 0.016),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(0.004, 0.014) * (Math.random() < 0.5 ? -1 : 1),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.5, 1.3),
        color: pick(['yellow', 'sky', 'orange', 'chrome']),
      });
    }

    /* 2. 视差星层 */
    field = [];
    var layers = [
      { count: small ? 14 : (mid ? 26 : 40), speed: 0.018, rMin: 0.4, rMax: 0.9, a: 0.32 },
      { count: small ? 10 : (mid ? 16 : 26), speed: 0.045, rMin: 0.7, rMax: 1.3, a: 0.42 },
      { count: small ? 6 : (mid ? 10 : 14), speed: 0.09, rMin: 1.1, rMax: 1.8, a: 0.55 },
    ];
    layers.forEach(function (L) {
      var n = Math.round(L.count * k);
      for (var i = 0; i < n; i++) {
        field.push({
          x: rand(0, W),
          y: rand(0, H),
          speed: L.speed * rand(0.75, 1.25),
          r: rand(L.rMin, L.rMax),
          baseAlpha: L.a,
          phase: rand(0, Math.PI * 2),
          twinkle: rand(0.3, 0.8),
          color: pick(['chrome', 'sky', 'yellow', 'orange']),
        });
      }
    });

    /* 3. 上升星尘 */
    var moteCount = Math.round((small ? 10 : (mid ? 16 : 24)) * k);
    motes = [];
    for (var i = 0; i < moteCount; i++) {
      motes.push({
        bx: rand(0, W),
        y: rand(0, H),
        r: rand(0.6, 2),
        vy: rand(-0.14, -0.04),
        sway: rand(0.05, 0.22),
        swaySpeed: rand(0.002, 0.006),
        phase: rand(0, Math.PI * 2),
        twinkle: rand(0.4, 1.1),
        color: pick(['yellow', 'sky', 'orange', 'accent', 'chrome']),
      });
    }

    /* 4. 飘落尘屑 */
    var dustCount = Math.round((small ? 6 : 12) * k);
    dust = [];
    for (var i = 0; i < dustCount; i++) {
      dust.push({
        x: rand(0, W),
        y: rand(0, H),
        r: rand(0.5, 1.4),
        vy: rand(0.03, 0.09),
        sway: rand(0.04, 0.14),
        swaySpeed: rand(0.002, 0.005),
        phase: rand(0, Math.PI * 2),
        twinkle: rand(0.4, 0.9),
        color: pick(['chrome', 'sky', 'yellow']),
      });
    }

    ripples = [];
    rippleWait = rand(5000, 10000);
    meteor = null;
    meteorWait = rand(6000, 14000);

    window.__bgfx = {
      stars: stars.length,
      field: field.length,
      motes: motes.length,
      dust: dust.length,
      reduced: reduced,
    };
  }

  /* ---------- 绘制 ---------- */
  function drawStar(s, sec, scroll) {
    var sy = wrapY(s.y + scroll * PARALLAX);
    var tw = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(sec * s.speed + s.phase));
    ctx.save();
    ctx.translate(s.x, sy);
    ctx.rotate(s.rot);
    ctx.globalAlpha = tw * 0.5;
    ctx.fillStyle = palette[s.color];
    var r = s.r;
    ctx.beginPath();
    for (var kk = 0; kk < 8; kk++) {
      var rad = kk % 2 === 0 ? r : r * 0.42;
      var a = (kk / 8) * Math.PI * 2 - Math.PI / 2;
      var px = Math.cos(a) * rad;
      var py = Math.sin(a) * rad;
      kk === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* 星座连线：随滚动视差一起移动，缓慢呼吸 */
  function drawConstellation(sec, scroll) {
    ctx.lineWidth = 1;
    for (var i = 0; i < stars.length; i++) {
      for (var j = i + 1; j < stars.length; j++) {
        var a = stars[i], b = stars[j];
        var ay = wrapY(a.y + scroll * PARALLAX);
        var by = wrapY(b.y + scroll * PARALLAX);
        var dx = a.x - b.x;
        var dy = ay - by;
        var d = Math.hypot(dx, dy);
        if (d < LINK_TH) {
          var pulse = 0.6 + 0.4 * Math.sin(sec * 0.5 + a.phase);
          ctx.globalAlpha = (1 - d / LINK_TH) * LINK_A * pulse;
          ctx.strokeStyle = palette.chrome;
          ctx.beginPath();
          ctx.moveTo(a.x, ay);
          ctx.lineTo(b.x, by);
          ctx.stroke();
        }
      }
    }
  }

  function drawFieldDot(f, sec) {
    var alpha = f.baseAlpha * (0.6 + 0.4 * Math.sin(sec * f.twinkle + f.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette[f.color];
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMote(m, sec) {
    var alpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(sec * m.twinkle + m.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette[m.color];
    ctx.beginPath();
    ctx.arc(m.bx + Math.sin(sec * m.swaySpeed * 1000 + m.phase) * m.sway * 60, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDust(d, sec) {
    var alpha = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(sec * d.twinkle + d.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette[d.color];
    ctx.beginPath();
    ctx.arc(d.x + Math.sin(sec * d.swaySpeed * 1000 + d.phase) * d.sway * 50, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 雷达涟漪 */
  function maybeRipple(dt) {
    if (reduced) return;
    rippleWait -= dt;
    if (rippleWait <= 0 && ripples.length < 3) {
      ripples.push({
        x: rand(W * 0.12, W * 0.88),
        y: rand(H * 0.15, H * 0.85),
        r: 4,
        max: rand(36, 70),
        life: 0,
        maxLife: rand(90, 150),
        color: pick(['sky', 'chrome']),
      });
      rippleWait = rand(5000, 11000);
    }
  }
  function drawRipple(r) {
    var p = r.life / r.maxLife;
    ctx.globalAlpha = (1 - p) * 0.22;
    ctx.strokeStyle = palette[r.color];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    r.r += (r.max - 4) / r.maxLife;
    r.life += 1;
    if (r.life >= r.maxLife) r.dead = true;
  }

  /* 流星 */
  function maybeMeteor(dt) {
    if (reduced || meteor) return;
    meteorWait -= dt;
    if (meteorWait <= 0) {
      meteor = {
        x: rand(W * 0.3, W * 0.98),
        y: rand(H * 0.04, H * 0.38),
        vx: rand(-2.4, -1.1),
        vy: rand(0.8, 1.5),
        len: rand(60, 110),
        life: 0,
        max: rand(110, 150),
      };
      meteorWait = rand(14000, 28000);
    }
  }
  function drawMeteor(m) {
    var p = m.life / m.max;
    var alpha = Math.sin(p * Math.PI) * 0.45;
    if (alpha <= 0.01) return;
    var vlen = Math.hypot(m.vx, m.vy);
    var hx = m.x + m.vx * m.life;
    var hy = m.y + m.vy * m.life;
    var tx = hx - (m.vx / vlen) * m.len;
    var ty = hy - (m.vy / vlen) * m.len;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = palette.sky;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.globalAlpha = Math.min(alpha + 0.2, 0.8);
    ctx.fillStyle = palette.sky;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.1, 0, Math.PI * 2);
    ctx.fill();
    m.life += 1;
    if (m.life > m.max) meteor = null;
  }

  /* ---------- 主循环 ---------- */
  function step(t) {
    if (isMotionOff()) {
      running = false;
      ctx.clearRect(0, 0, W, H);
      return;
    }
    var dt = lastT ? t - lastT : 16;
    lastT = t;
    var sec = t / 1000;
    var scroll = window.scrollY || 0;

    ctx.clearRect(0, 0, W, H);

    /* 星座连线（画在最底层，随滚动视差移动） */
    drawConstellation(sec, scroll);

    /* 视差星层 */
    for (var fi = 0; fi < field.length; fi++) {
      var f = field[fi];
      f.x -= f.speed * dt;
      if (f.x < -4) { f.x = W + 4; f.y = rand(0, H); }
      drawFieldDot(f, sec);
    }

    /* 四角星：漂移 + 出界重生 + 滚动视差 */
    for (var si = 0; si < stars.length; si++) {
      var s = stars[si];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -40) { s.x = W + 40; s.y = rand(0, H); }
      else if (s.x > W + 40) { s.x = -40; s.y = rand(0, H); }
      if (s.y < -40) { s.y = H + 40; s.x = rand(0, W); }
      else if (s.y > H + 40) { s.y = -40; s.x = rand(0, W); }
      s.rot += s.rotSpeed * dt;
      drawStar(s, sec, scroll);
    }

    /* 上升星尘 */
    for (var mi = 0; mi < motes.length; mi++) {
      var m = motes[mi];
      m.y += m.vy * dt;
      if (m.y < -12) { m.y = H + 12; m.bx = rand(0, W); }
      drawMote(m, sec);
    }

    /* 飘落尘屑 */
    for (var di = 0; di < dust.length; di++) {
      var d = dust[di];
      d.y += d.vy * dt;
      if (d.y > H + 12) { d.y = -12; d.x = rand(0, W); }
      drawDust(d, sec);
    }

    /* 雷达涟漪 */
    maybeRipple(dt);
    ripples = ripples.filter(function (r) { return !r.dead; });
    for (var ri = 0; ri < ripples.length; ri++) drawRipple(ripples[ri]);

    /* 流星 */
    maybeMeteor(dt);
    if (meteor) drawMeteor(meteor);

    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running || isMotionOff()) return;
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
  }

  /* ---------- 低电量模式 ---------- */
  function applyReduced(on) {
    if (reduced === on) return;
    reduced = on;
    if (W > 0) initField();   // 重建各层密度
  }
  if ('getBattery' in navigator) {
    navigator.getBattery().then(function (b) {
      var update = function () {
        applyReduced(typeof b.level === 'number' && !b.charging && b.level <= 0.2);
      };
      if (b.addEventListener) {
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      }
      update();
    }).catch(function () { /* 无电池/权限受限时静默 */ });
  }

  /* ---------- 事件绑定 ---------- */
  new MutationObserver(function () {
    readPalette();
    if (isMotionOff()) stop();
    else start();
  }).observe(html, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', function () {
    resize();
    if (!isMotionOff()) start();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!isMotionOff()) start();
  });

  /* ---------- 启动 ---------- */
  readPalette();
  resize();
  if (!isMotionOff()) start();
})();
