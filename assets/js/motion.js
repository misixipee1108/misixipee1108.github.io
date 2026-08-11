/**
 * 动效系统：滚动揭示 + 阅读进度条 + 回到顶部
 * 读者可通过页头按钮（#motionToggle）开关动效，选择存储在 localStorage('motion-preference')。
 * 站点默认由 [params.motion].enabled 控制（head 内联脚本已预先应用 motion-off 类）。
 */
(function () {
  'use strict';

  const html = document.documentElement;
  const motionOff = () => html.classList.contains('motion-off');

  /* ---------- 1. 滚动揭示（动效关闭时跳过）---------- */
  let revealSetup = false;

  function setupReveal() {
    if (revealSetup) return;
    revealSetup = true;

    // 首页按卡片整体揭示；列表页按条目逐个揭示（带轻微交错）
    const isHome = !!document.querySelector('.home-grid');
    const targets = isHome
      ? Array.from(document.querySelectorAll('.home-grid .home-card'))
      : Array.from(document.querySelectorAll('.post-list .post-item'));

    if (!targets.length) return;

    // 无 IO 支持时：全部保持可见（不加 reveal）
    if (!('IntersectionObserver' in window)) return;

    // 仅在视口外的元素才做滚动揭示（首屏元素直接显示，不依赖动画）
    const hidden = targets.filter((el) => {
      const rect = el.getBoundingClientRect();
      return !(rect.top < window.innerHeight - 32 && rect.bottom > 0);
    });
    if (!hidden.length) return;

    hidden.forEach((el, i) => {
      el.classList.add('reveal');
      // 交错延迟：最多 240ms
      el.style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );

    hidden.forEach((el) => io.observe(el));

    // 兜底：滚动/缩放时检查（兼容 IO 回调不触发的环境；强制跳变保证可见）
    const onScroll = () => {
      hidden.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 32 && rect.bottom > 0) {
          el.style.transition = 'none';
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  if (!motionOff()) setupReveal();

  /* ---------- 2. 阅读进度条（仅文章页有该元素）---------- */
  const progress = document.getElementById('reading-progress');
  if (progress) {
    const update = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = total > 0 ? window.scrollY / total : 0;
      progress.style.transform = `scaleX(${pct})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ---------- 3. 回到顶部 ---------- */
  const backTop = document.getElementById('back-to-top');
  if (backTop) {
    const toggle = () => backTop.classList.toggle('is-visible', window.scrollY > 600);
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 4. 动效开关按钮 ---------- */
  const toggleBtn = document.getElementById('motionToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const off = html.classList.toggle('motion-off');
      localStorage.setItem('motion-preference', off ? 'off' : 'on');
      // 重新开启时，补上尚未初始化的滚动揭示
      if (!off) setupReveal();
    });
  }
})();
