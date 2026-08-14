# 点赞者头像墙 — 后端函数

Waline 的点赞（👍 反应）**只存储计数，不存储点赞者身份**，因此"点赞用户头像列表"需要一个
极轻量的登记服务。本目录提供 Vercel Serverless 函数，配合 Vercel KV 持久化。

## 部署（约 5 分钟）

### 方式 A：并入现有 Waline 的 Vercel 项目（推荐，同域无跨域问题）

1. 把本目录的 `api/likers.js` 复制到你现有 Waline 项目的 `api/` 目录（Vercel 会自动把
   `api/*.js` 识别为 Serverless 函数，无需改 `vercel.json`）；
2. 在 Vercel 控制台创建 **KV 存储**（Storage → Create → KV，选免费额度）；
3. 把 KV 实例连接到该项目（Vercel 会自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 环境变量）；
4. 重新部署（Deploy）。
5. 验证：`https://<你的域名>/api/likers?path=/` 应返回 `{"errno":0,"data":[]}`。

### 方式 B：独立最小项目

1. 新建 Vercel 项目，把本目录内容（`api/`、`vercel.json`）推上去；
2. 同样创建 KV 并连接；
3. 部署后得到域名，把该域名填到站点 `hugo.toml` 的 `likersAPI`。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/likers?path=/文章路径/` | 返回该文章点赞者列表（最多 30 条） |
| POST | `/api/likers` | body `{ path, nick, mail, uid, action }`，`action='add'` 登记、`'remove'` 移除 |

- 身份去重：有邮箱用邮箱；匿名访客用客户端持久化 `uid`（浏览器 localStorage）
- 头像：服务端按邮箱计算 cravatar（国内可达）；匿名者由前端显示站内默认头像

## 安全说明

- 接口仅做字段长度限制与路径白名单（≤300 字符），无鉴权（与评论区匿名机制一致）；
  如需防刷可自行加 IP 限流（Vercel KV 记数）——个人站一般无需。
- KV 免费额度（每月约 3 万次读写）对个人站绰绰有余。

## 前端

站点侧的前端已实现（`assets/js/likers.js`）：点赞时自动登记访客、在 👍 旁渲染头像墙，
后端不可用时自动静默隐藏。前端 API 地址通过 `hugo.toml` 的
`[params.comments.waline] likersAPI` 配置。
