/**
 * 站内搜索：Fuse.js 模糊搜索（常驻搜索条 + 下拉结果）
 * 依赖：baseof 中先加载 fuse.min.js（CDN，暴露全局 Fuse）
 * 结构：<div class="site-search" id="siteSearch" data-index-url="...">
 */
(function () {
  'use strict';

  const search = document.getElementById('siteSearch');
  if (!search) return;

  const input = search.querySelector('.site-search__input');
  const resultsEl = search.querySelector('.site-search__results');
  const emptyEl = search.querySelector('.site-search__empty');
  const indexUrl = search.getAttribute('data-index-url') || '/index.json';

  let fuse = null;
  let loading = false;
  let loaded = false;

  function loadIndex() {
    if (loading || loaded) return;
    loading = true;

    if (typeof Fuse === 'undefined') {
      emptyEl.textContent = '搜索组件加载失败，请稍后重试';
      loading = false;
      return;
    }

    fetch(indexUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('index fetch failed'))))
      .then((data) => {
        fuse = new Fuse(data, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'tags', weight: 0.3 },
            { name: 'categories', weight: 0.15 },
            { name: 'summary', weight: 0.15 },
          ],
          threshold: 0.4,
          ignoreLocation: true,
          minMatchCharLength: 1,
        });
        loaded = true;
        render(input.value);
      })
      .catch(() => {
        emptyEl.textContent = '搜索索引加载失败，请稍后重试';
      })
      .finally(() => {
        loading = false;
      });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function render(query) {
    const q = (query || '').trim();

    if (!q) {
      resultsEl.innerHTML = '';
      emptyEl.style.display = '';
      emptyEl.textContent = '输入关键词开始搜索';
      return;
    }

    if (!fuse) return;

    const results = fuse.search(q).slice(0, 8);

    if (!results.length) {
      resultsEl.innerHTML = '';
      emptyEl.style.display = '';
      emptyEl.textContent = '未找到相关内容';
      return;
    }

    emptyEl.style.display = 'none';
    resultsEl.innerHTML = results
      .map(({ item }) => {
        const tags = (item.tags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join('');
        return `
        <a class="site-search__result" href="${item.url}">
          <div class="site-search__result-title">${escapeHtml(item.title)}</div>
          ${tags ? `<div class="site-search__result-meta">${tags}</div>` : ''}
        </a>`;
      })
      .join('');
  }

  // 常驻搜索条：页面加载后立即预加载索引
  loadIndex();

  input.addEventListener('focus', () => {
    search.classList.add('is-active');
    if (input.value) render(input.value);
  });
  input.addEventListener('input', () => {
    search.classList.add('is-active');
    render(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.classList.remove('is-active');
      input.blur();
    }
    if (e.key === 'Enter') {
      const first = resultsEl.querySelector('.site-search__result');
      if (first) window.location.href = first.getAttribute('href');
    }
  });

  // 点击搜索条外部时收起下拉
  document.addEventListener('click', (e) => {
    if (!search.contains(e.target)) search.classList.remove('is-active');
  });
})();
