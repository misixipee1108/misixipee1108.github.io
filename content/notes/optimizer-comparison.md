---
title: "Comming Soon"
date: 2026-07-20
tags: ["深度学习", "优化器", "笔记"]
categories: ["机器学习"]
description: "SGD、Adam、AdamW 等主流优化器的原理与使用场景对比。"
toc: true
math: true
---

这是一篇学习笔记的示例。你可以在这里记录技术学习心得。

## 背景

深度学习优化器是训练神经网络的核心组件...

## 公式示例

Adam 的更新规则可以表示为：

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t
$$

其中 $\hat{m}_t$ 和 $\hat{v}_t$ 分别是偏差校正后的一阶矩和二阶矩估计。

## 总结

不同优化器适应不同场景，需要根据具体任务选择。
