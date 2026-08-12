# AGENTS.md — Misixipee 个人主页（Hugo）

中文个人主页，基于 **Hugo（extended，固定 0.128.0）** + 自研主题 `themes/zen`，部署到 GitHub Pages。

## 常用命令

- 本地预览：`hugo server`（端口 1313）
- 构建校验：`hugo --renderToMemory --quiet`（编辑后先跑这个确认无错）
- 生产构建：`hugo --minify`（产物在 `public/`）
- 部署：push 到 `main` 触发 `.github/workflows/hugo.yml` 自动构建部署

> ⚠️ Hugo 版本被固定为 **extended 0.128.0**（本地与 CI 一致），升级或降级可能导致构建差异。

## 项目结构

- `content/` — 四个内容分区（永久链接 `/<section>/:slug/`）：
  - `articles/` 观点文章、`notes/` 学习笔记、`thoughts/` 杂谈（游戏设计文公式密集）、`projects/` 项目页
- `data/projects.json` — 项目数据源（首页「项目成果」卡片读取）
- `layouts/` — 站点级布局，**覆盖** `themes/zen/layouts/`（同路径优先）
- `themes/zen/` — 自研主题（非 submodule），含首页 `index.html`、列表页、projects 布局
- `assets/css/main.css` — 全站样式（明暗双模式，CSS 变量驱动）
- `assets/js/` — 5 个 JS 在 `baseof.html` 中合并压缩 + 指纹化
- `public/` — **已提交的构建产物**，不要手改；改内容后重新 `hugo` 构建

## 内容写作约定

- 默认语言 `zh-cn`，正文用中文；日期格式 `2006年1月2日`
- Front matter 常用字段：`title` / `date` / `tags` / `categories` / `description` / `toc`（侧栏目录开关）/ `math`（KaTeX）/ `cover` / `comments`（`false` 关闭 Waline 评论）
- **KaTeX 数学**：goldmark passthrough 已启用，行内 `$...$`、块级 `$$...$$`；含公式文章需 `math: true`
- **允许内嵌 HTML**（`goldmark.renderer.unsafe = true`）
- 短代码（`layouts/shortcodes/`）：
  - `{{< img src="..." alt="..." caption="..." >}}` 图片（带标题、点击放大）
  - `{{< video src="..." platform="youtube|bilibili|local" >}}` 视频（支持 `ratio="4-3"`）
  - `{{< algo title="..." input="..." output="..." caption="..." >}}...{{< /algo >}}` 算法框
- 新建文章用 `hugo new articles/xxx.md`（archetypes 自动带好 front matter）

## 前端与交互

- 主题切换 `localStorage 'theme-preference'`（`html.theme-dark/light`）
- 动效开关 `localStorage 'motion-preference'`；滚动揭示 `.reveal/.is-visible`、阅读进度条
- 搜索：Fuse.js 读取首页 `index.json`（`hugo.toml` 的 `[outputs] home` 含 JSON）
- 侧栏目录 scroll-spy、正文图片点击放大
- 外部服务：Waline 评论/点赞（`https://misixipee1108githubiodata.vercel.app`）、Umami 统计

## 已知坑

1. **hugo server 的 Fast Render 可能不重建全部内容**（此前 1313 页面只显示部分表格）；内容大改后重启 server 或加 `--disableFastRender`
2. 正文表格样式在 `main.css` 的 Article Content 区（`.article__content table`），靠主题变量适配明暗模式；main.css 原有的 `color-mix`、`scrollbar-width/color` 警告为非错误，勿当作问题修复
3. `toc: true` 只渲染左侧 `sidebar-toc.html`，不要在 `single.html` 里再加正文上方目录（曾因此出现重复目录）
4. 改 JS/CSS 后需重新构建才会更新指纹文件（`main.min.*.css`）
