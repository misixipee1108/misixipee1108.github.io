---
title: "名词解释功能 Demo"
date: 2026-08-18
description: "名词解释弹窗功能演示页（临时，不进入列表）"
toc: false
math: true
---

这是一个**名词解释功能**的演示页。点击正文中带点状下划线的词，会弹出一个小窗解释该名词；点击弹窗外部或按 `Esc` 可关闭。

## 示例

1. {{< term key="rogue" >}}肉鸽游戏{{< /term >}}是本文档要解释的第一个词条。

2. {{< term key="sr" >}}可达状态空间{{< /term >}}的释义中包含 KaTeX 行内公式。

3. {{< term key="fm" >}}Flow Matching{{< /term >}}的释义中包含块级公式（$$ 定界符）：

   $$
   \frac{\mathrm{d}\boldsymbol{x}_t}{\mathrm{d}t}
   =\boldsymbol{v}_\theta(\boldsymbol{x}_t,t)
   $$

4. {{< term key="cnf" >}}连续归一化流{{< /term >}}支持通过 `text` 参数自定义显示文字：{{< term key="cnf" text="CNF（自定义文字）" />}}

5. 不存在的 key（如 `{{</* term key="not-exist" */>}}这个没有解释{{</* /term */>}}`）点击时不会弹窗，也不报错。

## 交互说明

- 点击 / 回车（Enter）/ 空格（Space）开合弹窗；
- 点击页面其他位置、按 `Esc`、滚动或缩放页面都会关闭；
- 弹窗会在视口边缘自动翻转方向并夹紧，不超出屏幕。
