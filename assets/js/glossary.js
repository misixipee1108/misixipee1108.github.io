/**
 * 名词解释弹窗（Glossary Popup）
 * ------------------------------------------------------------------
 * · 标记：{{< term key="..." >}} 由 shortcodes/term.html 渲染为
 *   <span class="term" data-term="...">，数据来自 data/glossary.json
 *   （baseof.html 注入 <script type="application/json" id="glossary-data">）
 * · 交互：点击 / Enter / Space 开合；点击外部或 Esc 关闭；滚动/缩放时关闭
 * · 弹窗：页面级单例，position:fixed，视口边缘自动夹紧与翻转
 * · KaTeX：若页面加载了 auto-render（math: true），对 def 内容二次渲染公式
 * · 降级：key 不存在时静默无动作；无数据时不初始化
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('glossary-data');
  if (!dataEl) return;

  var GLOSSARY = {};
  try { GLOSSARY = JSON.parse(dataEl.textContent) || {}; } catch (e) { GLOSSARY = {}; }

  var popup = null;
  var activeTerm = null;
  var GAP = 10;          // 弹窗与术语的间距
  var MARGIN = 10;       // 视口边缘留白

  var KATEX_DELIMS = [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ];

  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'term-popup';
    popup.className = 'term-popup';
    popup.setAttribute('role', 'tooltip');
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML =
      '<div class="term-popup__term"></div>' +
      '<div class="term-popup__def"></div>' +
      '<a class="term-popup__link" target="_blank" rel="noopener"></a>';
    document.body.appendChild(popup);
    return popup;
  }

  function renderMath(container) {
    if (typeof window.renderMathInElement === 'function') {
      try {
        window.renderMathInElement(container, { delimiters: KATEX_DELIMS, throwOnError: false });
      } catch (e) { /* 公式渲染失败不影响弹窗本身 */ }
    }
  }

  function setOpen(open) {
    if (!popup) return;
    popup.classList.toggle('is-open', open);
    popup.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (activeTerm) activeTerm.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function open(term, entry) {
    ensurePopup();

    var rect = term.getBoundingClientRect();

    popup.querySelector('.term-popup__term').textContent = entry.term || '';
    var defEl = popup.querySelector('.term-popup__def');
    defEl.innerHTML = entry.def || '';
    renderMath(defEl);

    var linkEl = popup.querySelector('.term-popup__link');
    if (entry.link) {
      linkEl.href = entry.link;
      linkEl.textContent = '延伸阅读 →';
      linkEl.style.display = '';
    } else {
      linkEl.removeAttribute('href');
      linkEl.textContent = '';
      linkEl.style.display = 'none';
    }

    // 此刻弹窗仍为 visibility:hidden，可直接测量
    var pw = popup.offsetWidth;
    var ph = popup.offsetHeight;

    // 水平：优先居中于术语，视口边缘夹紧
    var left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - pw - MARGIN));

    // 垂直：优先下方，放不下则上方
    var below = rect.bottom + GAP;
    var above = rect.top - GAP - ph;
    var top = (below + ph <= window.innerHeight - MARGIN || above < MARGIN) ? below : above;
    if (top + ph > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, window.innerHeight - ph - MARGIN);
    }

    // 箭头对准术语中心（夹紧在弹窗内）
    var arrowX = rect.left + rect.width / 2 - left;
    arrowX = Math.max(14, Math.min(arrowX, pw - 14));

    popup.classList.toggle('is-above', top < rect.top);
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.setProperty('--arrow-x', arrowX + 'px');

    activeTerm = term;
    setOpen(true);
  }

  function close() {
    if (!popup) return;
    setOpen(false);
    activeTerm = null;
  }

  function toggle(term) {
    if (activeTerm === term) { close(); return; }
    var key = term.getAttribute('data-term');
    var entry = GLOSSARY[key];
    if (!entry) return;
    open(term, entry);
  }

  document.addEventListener('click', function (e) {
    var term = e.target.closest('.term');
    if (term) { toggle(term); return; }
    if (popup && !popup.contains(e.target)) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { close(); return; }
    var t = e.target;
    if (t && t.classList && t.classList.contains('term') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggle(t);
    }
  });

  // 滚动 / 缩放 / 页面尺寸变化时关闭（简单可靠，避免定位漂移）
  ['scroll', 'resize'].forEach(function (ev) {
    window.addEventListener(ev, close, { passive: true });
  });
})();
