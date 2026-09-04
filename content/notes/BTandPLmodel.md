---
title: "Bradley–Terry (BT) model 和 Plackett-Luce (PL) model"
date: 2026-09-02
tags: ["强化学习", "CV"]
categories: ["机器学习"]
description: "梳理 Bradley–Terry model 和 Plackett-Luce model 的定义，并分析讨论其关系"
toc: true
math: true
---

## 1. 什么是 BT Model？

BT Model 是一种用于描述“两两比较偏好”的概率模型。它的基本使用场景是给定两个对象 $i$ 和 $j$，我们希望根据它们各自的偏好评分，估计对象 $i$ 优于对象 $j$ 的概率。假设两个对象分别具有潜在得分 $s_i$ 和 $s_j$，那么 BT Model 将 $i$ 优于 $j$ 的概率定义为：

$$
P(i\succ j)=
\frac{\exp(s_i)}
{\exp(s_i)+\exp(s_j)}=
\sigma(s_i-s_j)
$$

其中 $\sigma(\cdot)$ 表示 Sigmoid 函数。这个公式意味着，BT Model 真正关心的并不是两个对象绝对分数有多大，而是它们之间的分数差 $s_i-s_j$。当 $s_i=s_j$ 时，两者被偏好的概率均为 $0.5$；当 $s_i$ 明显大于 $s_j$ 时，$i$ 被选择的概率会逐渐接近 $1$。因此，BT Model 的核心作用就是从大量“两两谁更好”的观测结果中，反推出对象背后的潜在偏好分数。

## 2. 什么是 PL Model？

PL Model 是一种用于描述多个对象排序结果的概率模型。与 BT Model 一次只考虑两个对象不同，PL Model 可以直接处理多个候选对象之间的完整排序或部分排序。例如，对于四个回答 $A,B,C,D$，如果人类给出的偏好顺序是：

$$
A\succ B\succ C\succ D
$$

那么 PL Model 可以直接计算这一整个排序出现的概率，PL Model 可以理解为一个连续选择过程。假设每个对象具有得分 $s_i$，首先从全部候选对象中选择排名第一的对象，被选择的概率与 $\exp(s_i)$ 成正比；第一名确定之后，将其从候选集合中移除，再从剩余对象中选择第二名；然后继续重复这个过程，直到整个排序形成。对于排序：

$$
\pi_1\succ\pi_2\succ\cdots\succ\pi_n
$$

其概率可以写成：

$$
P(\pi)=
\prod_{k=1}^{n-1}
\frac{
\exp(s_{\pi_k})
}{
\sum_{j=k}^{n}\exp(s_{\pi_j})
}
$$

很容易可以看出，当只有两个对象进行对比时，PL Model 退化为 BT Model。

## 3. Logistic 模型

事实上，对于 BT Model，可以将其看作 Logistic 模型的一个特例，下面我们先介绍 Logistic 模型，他的基本公式是：

$$
p=\sigma(z)=\frac{1}{1+e^{-z}}
$$

其中 $z$ 是得分，它是一个简单的 Sigmoid 函数，可以把一个任意实数分值映射成 0 到 1 之间的概率，这种连续处理的思路可以把某些不可导的函数变为可导，且不改变其原本的信息关系。再回过头来看 BT Model 可以发现，如果令 $z=s_i-s_j$，则 BT Model 就可以看作是 Logistic 模型的一种特殊情况。这有什么意义呢？事实上，有很多函数都可以把一个无限值域的分布映射到 $[0,1]$ 区间，而也有其他方法采用了别的映射函数，我们分析可知，Sigmoid 事实上有很多优美的地方。

我们不妨考察 Bernoulli 分布，他描述的是在每次 IID 中，假如结果只有成功（记作1）和失败（记作0），出现若干次成功的概率分布，这个分布可以很好的描述两两对比情境下的概率分布，比如一对一的棋类比赛（不考虑和棋），竞技体育，游戏等等。其公式为：

$$
P(Y=y)=p^y(1-p)^{1-y},\qquad y\in\{0,1\}
$$

改写成对数形式为：

$$
\log P(Y=y)=
y\log p+(1-y)\log(1-p)
$$

调整一下写法，可以得到：

$$
\log P(Y=y)=
y\log\frac{p}{1-p}+
\log(1-p)
$$

对于 Logistic 模型，反解出 z 可以得到

$$
z=\log\frac{p}{1-p}
$$

可以发现，$\log\frac{p}{1-p}$ 出现在了上述两个式子内，这个部分有一个更有名的叫法，即概率 p 的 logit 函数，从指数族的视角看，也可以叫做 Bernoulli 分布的自然参数，而 Sigmoid 恰恰正是这个函数的反函数。另外，Sigmoid具有对称性，连续性，在计算上也相对更加友好，种种因素使得 Sigmoid 成为了一个理想的映射函数的选择。

## 4. 一次观测能够获得多少信息？

显然，在具体应用中，不论是两个对象进行比较还是多个对象进行比较，有一个明显需要解决的问题，我们进行多少次观测能够才能够对两个或多个对象的价值进行高精度估计？事实上，研究者已经定义了这类量，叫做 Fisher 信息，用于衡量每次估计中对未知参数信息的获取，其基本定义是，对于估计参数 $\theta$，有：

$$
I(\theta)=
\mathbb{E}\left[
\left(
\frac{\partial}{\partial\theta}
\log p(Y\mid\theta)
\right)^2
\right]
$$

在一般的正则化要求下，可以简化为：

$$
I(\theta)=
-\mathbb{E}\left[
\frac{\partial^2}{\partial\theta^2}
\log p(Y\mid\theta)
\right]
$$

因此，对于 BT model，我们很容易求得一次观测的 Fisher 信息，首先，根据模型的定义，两个对象的得分记作：$\Delta_{ij}=s_i-s_j$，那么其单场对数似然为：

$$
\ell(\Delta_{ij})=
Y_{ij}\log p_{ij}+
(1-Y_{ij})\log(1-p_{ij})
$$

代入定义式很容易求得：

$$
I(\Delta_{ij})=
-\mathbb{E}\left[
\frac{\partial^2 \ell}{\partial \Delta_{ij}^2}
\right]=
p_{ij}(1-p_{ij})
$$

不难看出这就是 Bernoulli 方差的表达式，可以理解为，每次观测，都提供了 $p_{ij}(1-p_{ij})$ 的信息量。

事实上，Fisher 信息还可以用于传感器漂移校准，噪声检测，上升沿检测等领域，凡是需要通过多次采样预测参数的问题，都可以考虑将 Fisher 信息作为优化的目标函数，以获得最小的方差下界。在处理目标函数中，还会涉及到所谓的 A-optimality 和 D-optimality 的选择，应当根据具体需要选择目标函数。



