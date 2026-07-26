// 暗/亮主题切换
(function() {
  const STORAGE_KEY = 'theme-preference';
  const html = document.documentElement;

  // 获取存储的偏好或系统偏好
  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // 应用主题
  function applyTheme(theme) {
    html.className = 'theme-' + theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // 切换主题
  function toggleTheme() {
    const current = html.classList.contains('theme-dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // 初始化
  applyTheme(getPreferredTheme());

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // 绑定按钮
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  });
})();
