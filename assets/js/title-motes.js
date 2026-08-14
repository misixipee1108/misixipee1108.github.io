/**
 * 标题星点流光 — 悬停文章标题时，标题下方出现丝带状星星点点
 * ------------------------------------------------------------------
 * · 每颗四角星独立闪烁（随机周期/相位）+ 沿丝带缓慢漂移（随机速度）
 * · 颜色取自站点调色板（黄/青/橙/红/铬灰），随明暗主题实时读取
 * · 纯装饰（aria-hidden），事件委托于 document，不侵入模板结构
 * · 仅受站点动效开关（html.motion-off）控制；动效关闭时自动清除
 * · 支持键盘焦点（focusin/focusout）触发，与悬停一致
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var STAR_COUNT = 20;
  var COLORS = ['yellow', 'sky', 'orange', 'accent', 'chrome'];
  var SEL = '.post-item__title a, a.post-item__title';

  var isMotionOff = function () { return html.classList.contains('motion-off'); };

  var cssVar = function (name, fallback) {
    var v = getComputedStyle(html).getPropertyValue(name).trim();
    return v || fallback;
  };

  /* 几何对齐：以 .post-item__title 容器为基准，
     扣除行盒半行距使丝带紧贴文字（而非贴在行盒底部） */
  function positionBand(band, link, box) {
    var lr = link.getBoundingClientRect();
    var br = box.getBoundingClientRect();
    var cs = getComputedStyle(link);
    var fs = parseFloat(cs.fontSize) || 16;
    var lh = parseFloat(cs.lineHeight);
    if (!isFinite(lh) || lh <= 0) lh = fs * 1.4;
    var halfLeading = Math.max(0, (lh - fs) / 2);
    band.style.left = (lr.left - br.left) + 'px';
    band.style.top = (lr.bottom - br.top - halfLeading + 1) + 'px';
    band.style.width = lr.width + 'px';
  }

  function makeStar(band, i) {
    var s = document.createElement('span');
    s.className = 'title-motes__star';
    s.style.left = ((i + 0.5) / STAR_COUNT) * 100 + '%';
    var size = (7 + Math.random() * 2).toFixed(1);       // 7~9px，层次感
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.setProperty('--mote-color', cssVar('--' + COLORS[(Math.random() * COLORS.length) | 0]));
    var twinkle = (2 + Math.random() * 2.2).toFixed(2);   // 2.0~4.2s 闪烁周期
    var twinkleDelay = (-Math.random() * 3).toFixed(2);   // 负延迟错相
    var drift = (3 + Math.random() * 4).toFixed(2);       // 3.0~7.0s 漂移周期
    var driftDelay = (-Math.random() * 4).toFixed(2);
    s.style.animation =
      'mote-twinkle ' + twinkle + 's ease-in-out ' + twinkleDelay + 's infinite, ' +
      'mote-drift ' + drift + 's ease-in-out ' + driftDelay + 's infinite alternate';
    band.appendChild(s);
  }

  function buildMotes(link, box) {
    var band = document.createElement('span');
    band.className = 'title-motes';
    band.setAttribute('aria-hidden', 'true');

    var track = document.createElement('span');
    track.className = 'title-motes__track';
    band.appendChild(track);

    for (var i = 0; i < STAR_COUNT; i++) makeStar(band, i);

    box.appendChild(band);
    positionBand(band, link, box);

    // 窗口缩放导致换行时重新对齐（滚动无需处理：丝带随容器移动）
    var onResize = function () { positionBand(band, link, box); };
    window.addEventListener('resize', onResize);
    band._cleanup = function () { window.removeEventListener('resize', onResize); };

    requestAnimationFrame(function () { band.classList.add('is-active'); });
    return band;
  }

  function removeBand(band) {
    if (!band) return;
    band.classList.remove('is-active');
    if (band._cleanup) band._cleanup();
    setTimeout(function () { band.remove(); }, 320);   // 等淡出过渡完成
  }

  function enter(link) {
    if (isMotionOff()) return;
    var box = link.closest('.post-item__title');
    if (!box || box._motes) return;
    box._motes = buildMotes(link, box);
  }

  function leave(link) {
    var box = link.closest('.post-item__title');
    if (box && box._motes) {
      removeBand(box._motes);
      box._motes = null;
    }
  }

  /* 悬停（mouseover/mouseout 委托，relatedTarget 判进出） */
  document.addEventListener('mouseover', function (e) {
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!link) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(SEL) === link) return;
    enter(link);
  }, true);

  document.addEventListener('mouseout', function (e) {
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!link) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(SEL) === link) return;
    leave(link);
  }, true);

  /* 键盘焦点（可访问性） */
  document.addEventListener('focusin', function (e) {
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (link) enter(link);
  }, true);

  document.addEventListener('focusout', function (e) {
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (link) leave(link);
  }, true);

  /* 动效开关关闭时，清除进行中的星点 */
  new MutationObserver(function () {
    if (!isMotionOff()) return;
    document.querySelectorAll('.post-item__title').forEach(function (box) {
      if (box._motes) {
        removeBand(box._motes);
        box._motes = null;
      }
    });
  }).observe(html, { attributes: true, attributeFilter: ['class'] });
})();
