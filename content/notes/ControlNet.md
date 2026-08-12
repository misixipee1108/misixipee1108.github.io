---
title: "ControlNet 解析"
date: 2026-08-12
tags: ["生成模型", "CV", "扩散模型"]
categories: ["机器学习"]
description: "梳理 ControlNet 的条件注入原理、外挂式网络设计，以及与 LoRA 等方法在定位、效果与效率上的对比"
toc: true
math: true
---

## 1. 背景：文生图模型缺少"空间控制"

预训练文生图扩散模型（如 Stable Diffusion，简称 SD）通过文本提示词控制生成，但文本是一种较弱条件，也就是说，仅通过自然语言很难精确表达"图中的哪个部位要有什么结构"。实际应用中，我们经常希望把用户提供的**空间条件**注入模型，让生成结果严格服从这些几何约束，例如：Canny 边缘图，深度图，人体姿态骨架，语义分割 mask 等等，因此需要一种针对预训练模型进行快速调整的方法。针对这个问题，Zhang 等提出了ControlNet：在不改变预训练模型权重的前提下，给扩散模型外挂一个可训练的条件控制网络，从而以极低成本把任意空间条件接入既有的文生图模型。

{{< img src="/images/ControlNet/1786532913055.png" alt="ControlNet 总体架构图" caption="ControlNet 总体架构 来源：Zhang et al., 2023" >}}

## 2. 条件注入是怎么实现的

### 2.1 总体架构：冻结 + 复制 + Zero Convolution

ControlNet 的核心由三部分组成：**冻结原网络、复制一份可训练副本、用 zero convolution（零卷积）做旁路注入**。设原始网络中的某个模块为 $\mathcal{F}(\cdot;\Theta)$，其输入为 $x$（对于在像素空间的扩散模型，为 UNet 中的特征图 / 对于潜空间扩散模型，为 latent 特征），我们需要注入的外部条件为 $c$，则注入后的输出为

$$
y = \mathcal{F}(x;\Theta) + \mathcal{Z}\Bigl(\mathcal{F}\bigl(x + \mathcal{Z}(c;\Theta_{z,1});\,\Theta_c\bigr);\Theta_{z,2}\Bigr),
$$

其中：

- $\mathcal{F}(\cdot;\Theta)$：原始冻结的网络模块，参数 $\Theta$ 完全不更新，这样保证了不改变预训练权重，同时保证了模型的基本能力不会改变。
- $\mathcal{F}(\cdot;\Theta_c)$：与原网络**结构完全相同**的可训练副本，权重从原模型复制初始化，参数 $\Theta_c$ 参与训练；
- $\mathcal{Z}(\cdot;\Theta_z)$：zero convolution，即权重与偏置都初始化为 $0$ 的 1×1 卷积；公式中两个 zero conv 的参数分别记为 $\Theta_{z,1}$（输入侧）与 $\Theta_{z,2}$（输出侧）。它相当于对任何输入都会输出全零张量，且不改变输入的空间分辨率，其意义是在训练开始时手动把参数归零；
- $c$：外部条件（边缘图等）首先经过条件 encoder 降采样为 latent 对应的分辨率，然后经过 zero conv 编码到与特征图对齐的空间。

流程可以拆成五步：

1. 条件 $c$ 首先经过条件 encoder 降采样，获得对应分辨率下的条件输入；
2. 经过第一次 zero conv，编码进特征空间，与原始输入 $x$ 相加；
3. 相加后的结果送入结构相同的可训练副本 $\mathcal{F}(\cdot;\Theta_c)$；
4. 副本输出再经过第二次 zero conv；
5. 最后与冻结分支的输出 $\mathcal{F}(x;\Theta)$ 逐元素相加，完成一次条件注入。

这里有两个问题，首先，为什么用编码后的条件与原始输入相加？其次，为什么要与冻结分支的输出逐元素相加？

对于为什么用编码后的条件与原始输入相加，是因为在图像生成领域，条件输入（例如三通道边缘图）往往与
UNet 内部高维特征图不在同一空间，因此先使用一个 zero conv 把 $c$ 映射到与 $x$ 相同的特征空间。同时，相加的操作相当于一种残差连接，网络在不改变原有特征的情况下接收条件 $c$ 的注入。同样的，在最终与冻结分支的输出 $\mathcal{F}(x;\Theta)$ 逐元素相加，也是基于残差学习的考虑。

### 2.2 Zero Convolution 的设计思路

zero convolution 是一个 1×1 卷积层，其卷积核 $K$ 和偏置 $b$ 在训练初始化时全部置为 0：

$$
\mathcal{Z}(x;K,b)=K\ast x+b,\qquad K=0,\ b=0.
$$

1×1 卷积不改变空间分辨率（保持 $H\times W$），只在每个位置上做通道间的线性组合，因此输出与输入形状一致（除通道数外），便于后续逐元素相加。在代码上，官方实现用一个工具函数把任意卷积模块的参数全部清零：

```python
def zero_module(module):
    for p in module.parameters():
        p.detach().zero_()
    return module

# zero convolution
zero_conv = zero_module(nn.Conv2d(in_ch, out_ch, kernel_size=1))
```

训练开始时：

$$
\mathcal{Z}(c;\Theta_z)=0,\qquad \mathcal{Z}(\cdot;\Theta_z)=0,
$$

整个 ControlNet 旁路输出为 $0$，于是 $y=\mathcal{F}(x;\Theta)$，只有原模型的输出。与此同时，zero conv 的梯度并不为零，参数从零开始正常更新。随着训练进行，$K$ 与 $b$ 逐渐偏离 0，zero conv 输出不再为 0，条件信息开始在输出中发挥作用。

### 2.3 注入位置与时间步感知

在 SD1.5 的实现中，ControlNet 复制 U-Net 的 12 个 encoder blocks 和 1 个 middle block。各层输出经 zero convolution 后，分别注入主 U-Net 的 12 条 skip connections 和 middle block，使条件从粗到细逐步融入特征；可训练副本同样接收 **timestep embedding**，因此仍能获得去噪过程时间步与噪声特征的联系，在不同去噪阶段，条件以不同强度起作用（早期定结构，后期补细节）。

## 3. 与 LoRA 等方法的对比

LoRA 和 ControlNet 解决的是不同的问题，LoRA 微调在图像生成中可以学习风格、特定人物、物体，而 ControlNet 改变的是模型对条件输入的响应能力。需要注意的是，尽管现在的生图模型也可以使用自然语言以文本 prompt 表达风格，例如生成图片中说明图片应当具有“梵高风格”“赛博朋克风格”，但是 prompt 通过 cross-attention 作用在语义层，是粗糙的调制手段，相比之下，LoRA 直接通过微调将风格注入到权重中。更进一步的，ControlNet 要解决的是文本描述不了的东西，比如轮廓，深度图这样的条件，自然语言难以处理，因此使用条件直接注入要高效很多。

| 对比维度       | ControlNet                             | LoRA                        |
| -------------- | -------------------------------------- | --------------------------- |
| 解决的问题     | 空间/几何条件控制                      | 多种微调               |
| 是否修改原模型 | 否（冻结骨干 + 旁路注入）              | 否（冻结 + 低秩增量）       |
| 训练参数量     | 较大（复制 U-Net 的 encoder 与 middle block）                     | 极小                        |
| 数据需求       | 需条件标注数据                         | 通常很少，视情况而定                        |
| 空间控制精度   | 强（边缘/深度/姿态等精确约束）         | 弱 / 基本无                  |

## 4. Sudden Convergence Phenomenon

Zhang 在论文与官方说明中提到了一个现象，在前几千个训练步中，模型似乎完全无视输入的控制条件（如骨架图、线稿），生成的图像基本不服从条件；但到了某个特定节点，模型会在极短的几十上百步内，突然开窍，瞬间学会精准地按照控制条件生成图像，Zhang 在论文中称之为 Sudden Convergence Phenomenon（突然收敛现象）。原论文记录了这个现象，并把它与 zero convolution（权重、偏置均为零初始化的 $1\times1$ 卷积）联系起来，但没有给出完整的因果实验、严格数学证明或收敛定理。

同时，官方 FAQ 只进一步说明了“零初始化不等于无法学习”。即使使用了 zero convolution，梯度仍然非零，因此一次更新后 $w$ 就可能离开零点。目前，一个可能的解释是梯度门控机制。我们沿用 2.1 的符号：

$$
\hat y=\mathcal{F}(x;\Theta)+A\,\mathcal{F}(x+Bc;\Theta_c),
$$

其中 $\mathcal{F}(x;\Theta)$ 是冻结主干的输出，$\mathcal{F}(\cdot;\Theta_c)$ 是可训练副本；$A$ 与 $B$ 分别是输出侧、输入侧两个 zero conv 的简写（对应 $\mathcal{Z}(\cdot;\Theta_z)$ 的权重），初始化为

$$
A=0,\qquad B=0.
$$

记损失对输出的梯度为 $\delta=\partial\mathcal L/\partial\hat y$。忽略张量下标后，有

$$
\frac{\partial\mathcal L}{\partial A}
=\delta\,\mathcal{F}(x+Bc;\Theta_c)^\top,
$$

$$
\frac{\partial\mathcal L}{\partial\Theta_c}
=A^\top\delta\,\frac{\partial\mathcal F}{\partial\Theta_c},
$$

$$
\frac{\partial\mathcal L}{\partial B}
=\left(\frac{\partial\mathcal F}{\partial(x+Bc)}\right)^\top
A^\top\delta\,c^\top.
$$

在初始化点：$\partial\mathcal L/\partial A$ 通常不为零，因为可训练副本产生的特征 $\mathcal{F}(x;\Theta_c)$ 不为零；$\partial\mathcal L/\partial\Theta_c=0$；$\partial\mathcal L/\partial B=0$。所以训练天然出现近似的三阶段过程。

**第一阶段，外挂网络控制微弱：** 由于 $\partial\mathcal L/\partial A$ 在初始化点不为零，输出侧 zero conv 的权重 $A$ 首先离开零点。此时输入侧 zero conv 的权重 $B$ 仍为零，条件 $c$ 被挡住，输出大致仍是原始 SD 的输出，条件作用很弱。

**第二阶段，梯度进入控制分支：** 当 $A$ 不再为零后，$\partial\mathcal L/\partial\Theta_c$ 与 $\partial\mathcal L/\partial B$ 开始获得有效梯度，可训练副本 $\mathcal{F}(\cdot;\Theta_c)$ 与输入侧 zero conv 的权重 $B$ 随之更新，模型内部逐渐学习条件表示。

**第三阶段，控制信号超过阈值：** 当多层条件残差形成一致方向后，条件对输出的影响越过某个阈值，生成结果突然明显服从输入的控制图。

总的来说，这个现象可以近似解释为：两个 zero conv 同时构成梯度门控，输出侧 $A$ 因梯度非零而率先离开零点，而可训练副本 $\Theta_c$ 与输入侧 $B$ 的梯度都正比于 $A$，必须等 $A$ 打开后才能获得有效梯度；又因为条件效应正比于乘积 $AB$（二阶小量），在 $A$、$B$ 都很小的一段区间里条件几乎不影响输出，模型表现为长时间无视控制条件；直到 $AB$ 越过某个阈值，条件信号开始显著改变生成轨迹，模型便在一个很短的步数区间内突然学会遵循条件。整个过程中参数都是连续、平滑变化的，这个突变只体现在观测量层面。

## 参考资料

1. Zhang, Rao, Agrawala, [*Adding Conditional Control to Text-to-Image Diffusion Models*](https://arxiv.org/abs/2302.05543), ICCV 2023。
2. ControlNet 官方仓库，[FAQ](https://github.com/lllyasviel/ControlNet/blob/main/docs/faq.md)。
3. Peng et al., [*ControlNeXt: Powerful and Efficient Control for Image and Video Generation*](https://arxiv.org/html/2408.06070v3), 2024。
4. Zhong et al., [*Diffusion Tuning: Transferring Diffusion Models via Chain of Forgetting*](https://arxiv.org/html/2406.00773v1), 2024。
