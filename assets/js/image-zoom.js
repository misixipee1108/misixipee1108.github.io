// 图片灯箱放大 — 纯 CSS + JS，零依赖
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const content = document.querySelector('.article__content');
    if (!content) return;

    content.addEventListener('click', function(e) {
      const img = e.target.closest('img');
      if (!img) return;

      // 创建放大层
      const overlay = document.createElement('div');
      overlay.className = 'zoom-overlay';

      const cloned = img.cloneNode(true);
      cloned.style.cursor = 'default';
      overlay.appendChild(cloned);
      document.body.appendChild(overlay);

      // 点击关闭
      overlay.addEventListener('click', function() {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
      });

      // ESC 关闭
      function onKey(e) {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', onKey);
        }
      }
      document.addEventListener('keydown', onKey);
    });
  });
})();
