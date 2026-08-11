/**
 * TOC 侧栏滚动监听 (Scroll Spy)
 * 基于位置比较 + IntersectionObserver 触发检查，高亮当前阅读位置
 */
(function () {
  const sidebarNav = document.querySelector('.sidebar-toc__nav');
  const articleContent = document.querySelector('.article__content');
  if (!sidebarNav || !articleContent) return;

  // 收集所有正文标题及其对应的 TOC 链接
  const tocLinks = sidebarNav.querySelectorAll('a[href^="#"]');
  const linkMap = new Map();
  const headings = [];

  tocLinks.forEach(link => {
    const id = link.getAttribute('href').slice(1);
    const heading = document.getElementById(id);
    if (heading) {
      linkMap.set(heading, link);
      headings.push(heading);
    }
  });

  if (headings.length === 0) return;

  const HEADER_OFFSET = 100; // sticky header 高度 + 余量

  /**
   * 核心逻辑：找到最后一个顶部边缘 ≤ HEADER_OFFSET 的标题
   * 即"当前已经滚过（或正好在）阅读线"的最后一个标题，就是正在读的章节
   */
  function updateActive() {
    let activeHeading = null;

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= HEADER_OFFSET) {
        activeHeading = heading;
      } else {
        break; // 标题按 DOM 顺序排列，第一个在线下的就停止
      }
    }

    // 更新高亮
    tocLinks.forEach(l => l.classList.remove('active'));
    if (activeHeading) {
      const link = linkMap.get(activeHeading);
      if (link) link.classList.add('active');
    }
  }

  // IntersectionObserver 作为触发器：任何标题进入/离开视口时重新检查
  const observer = new IntersectionObserver(
    () => updateActive(),
    { rootMargin: `-${HEADER_OFFSET}px 0px 0px 0px` }
  );
  headings.forEach(h => observer.observe(h));

  // scroll 事件作为补充：确保滚动过程中的实时更新（rAF 节流）
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // 初始检查
  updateActive();
})();
