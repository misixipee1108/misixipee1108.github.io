---
title: "Flow Matching 基本原理分析"
date: 2026-08-18
tags: ["生成模型"]
categories: ["机器学习"]
description: "梳理了 Flow Matching 的基本原理和训练、采样过程"
toc: true
math: true
---
*本文附录中部分公式推导使用了 ChatGPT 5.6 Sol 模型，推导过程已经过作者本人验算

## 1. 为什么引入 Flow Matching

生成模型的核心任务，是把一个容易采样的分布 $p_0$，例如标准高斯分布，变换成复杂的数据分布 $p_1$。连续归一化流（Continuous Normalizing Flow，CNF）为这个问题提供了非常自然的动力系统表述：设样本 $\boldsymbol{x}_t\in\mathbb{R}^d$，用神经网络参数化随时间变化的速度场 $\boldsymbol{v}_\theta(\boldsymbol{x},t)$，再令样本服从常微分方程

$$
\frac{\mathrm{d}\boldsymbol{x}_t}{\mathrm{d}t}
=\boldsymbol{v}_\theta(\boldsymbol{x}_t,t),
\qquad \boldsymbol{x}_0\sim p_0.
$$

如果这个速度场合适，那么 ODE 的流映射 $\phi_t$ 会把 $p_0$ 逐步推送成一族中间分布 $p_t$，最终满足 $(\phi_1)_\#p_0=p_1$。概率密度在搬运过程中必须满足连续性方程

$$
\frac{\partial p_t(\boldsymbol{x})}{\partial t}
+\nabla_{\boldsymbol{x}}\cdot
\left(p_t(\boldsymbol{x})\boldsymbol{v}_t(\boldsymbol{x})\right)=0,
$$

它表达的正是“概率质量既不会凭空产生，也不会凭空消失”。沿着一条 ODE 轨迹，密度的变化还满足

$$
\frac{\mathrm{d}}{\mathrm{d}t}\log p_t(\boldsymbol{x}_t)
=-\nabla_{\boldsymbol{x}}\cdot\boldsymbol{v}_t(\boldsymbol{x}_t),
$$

因此 CNF 在理论上既能生成样本，也能通过积分散度计算似然。然而，传统的 CNF 最大似然训练通常要在每次参数更新中求解 ODE，并计算或估计速度场的散度；高维数据下，这会带来较大的时间、显存和数值稳定性负担。扩散模型实际上采用了另外一种方法：它先把数据逐渐加噪，再学习噪声或其他等价目标，最后通过逆向随机微分方程或概率流 ODE 还原数据。扩散模型训练稳定、效果强，但传统方法，如DDPM等在采样中需要较多的采样次数，计算成本较大。

Flow Matching 的关键设计为：先人为指定一条从 $p_0$ 到 $p_1$ 的概率路径，再直接回归能够产生这条路径的速度场。这样一来，训练时不必从 $t=0$ 数值积分到某个随机时刻，也不必通过 ODE 反向传播；只要能直接采样某个时刻的中间状态，并写出该状态应具有的瞬时速度，就能把训练转化为普通的有监督回归问题。这种方法保留连续归一化流的确定性、可逆性和路径建模能力，同时用直接的速度回归降低训练复杂度，同时大大提升了采样效率。

## 2. Flow Matching 的训练过程

为了说明训练目标，记源样本为 $\boldsymbol{x}_0\sim p_0$，数据样本为 $\boldsymbol{x}_1\sim p_1$，二者的联合配对关系记为耦合 $\pi(\boldsymbol{x}_0,\boldsymbol{x}_1)$。给定一对端点后，先定义条件路径

$$
\boldsymbol{x}_t=\psi_t(\boldsymbol{x}_0,\boldsymbol{x}_1),
\qquad t\in[0,1],
$$

并要求 $\psi_0(\boldsymbol{x}_0,\boldsymbol{x}_1)=\boldsymbol{x}_0$、$\psi_1(\boldsymbol{x}_0,\boldsymbol{x}_1)=\boldsymbol{x}_1$。沿这条路径的条件目标速度可以直接由时间求导得到：

$$
\boldsymbol{u}_t
\bigl(\boldsymbol{x}_t\mid\boldsymbol{x}_0,\boldsymbol{x}_1\bigr)
=\frac{\partial}{\partial t}
\psi_t(\boldsymbol{x}_0,\boldsymbol{x}_1).
$$

更一般地，可以采用 $\boldsymbol{x}_t=\alpha_t\boldsymbol{x}_1+\sigma_t\boldsymbol{x}_0$，其中 $\alpha_0=0$、$\alpha_1=1$、$\sigma_0=1$、$\sigma_1=0$，于是对应速度为

$$
\boldsymbol{u}_t
=\dot{\alpha}_t\boldsymbol{x}_1
+\dot{\sigma}_t\boldsymbol{x}_0.
$$

最常见且最容易理解的是线性插值，也就是 Rectified Flow 中常用的路径

$$
\boldsymbol{x}_t=(1-t)\boldsymbol{x}_0+t\boldsymbol{x}_1,
\qquad
\boldsymbol{u}_t=\boldsymbol{x}_1-\boldsymbol{x}_0.
$$

这里有一个细节：同一个空间位置 $\boldsymbol{x}$ 在同一时刻 $t$，可能由许多不同的端点对经过，而这些条件路径给出的速度并不相同；真正控制边缘分布 $p_t$ 的速度场，应该把这些条件速度在“已知当前状态为 $\boldsymbol{x}_t=\boldsymbol{x}$”的条件下取平均，即

$$
\boldsymbol{v}_t^*(\boldsymbol{x})
=\mathbb{E}_{\pi}
\left[
\boldsymbol{u}_t
\bigl(\boldsymbol{x}_t\mid\boldsymbol{x}_0,\boldsymbol{x}_1\bigr)
\,\middle|\,
\boldsymbol{x}_t=\boldsymbol{x}
\right].
$$

这个边缘速度场通常无法直接计算，因为它需要对所有可能经过当前位置的条件路径做后验平均。Flow Matching 的精妙之处在于，不必显式求出这个平均：从端点对和时间中采样，直接让网络回归每一条条件路径的速度即可。标准的条件 Flow Matching 目标为

$$
\mathcal{L}_{\mathrm{CFM}}(\theta)
=\mathbb{E}_{\substack{
(\boldsymbol{x}_0,\boldsymbol{x}_1)\sim\pi,\\
t\sim\mathcal{U}(0,1)
}}
\left[
w(t)
\left\|
\boldsymbol{v}_\theta(\boldsymbol{x}_t,t)
-\boldsymbol{u}_t
\bigl(\boldsymbol{x}_t\mid\boldsymbol{x}_0,\boldsymbol{x}_1\bigr)
\right\|_2^2
\right],
$$

其中 $w(t)$ 是可选的时间权重。平方损失的最优回归函数恰好就是上述条件期望，因此在适当条件下，这个可采样的条件目标与不可直接计算的边缘 Flow Matching 目标具有相同的最优解或相同的期望梯度。换句话说，网络虽然每次只看到一条随机条件路径的“局部速度标签”，大量样本平均后却会学到真正的边缘概率分布速度场。

对于训练中的一次参数更新，具体过程如下：从数据集取出 $\boldsymbol{x}_1$，从基分布取出 $\boldsymbol{x}_0$，随机采样时间 $t$，用选定的插值规则一次性构造 $\boldsymbol{x}_t$，再把 $\boldsymbol{x}_t$、time embedding 以及必要的条件信息输入网络，计算目标速度并最小化均方误差。整个过程不需要从零时刻积分到 $t$，所以任意时刻都可以被独立、并行地采样。对于条件生成，速度网络写成 $\boldsymbol{v}_\theta(\boldsymbol{x}_t,t,\boldsymbol{c})$，$\boldsymbol{c}$ 可以是类别、文本、图像特征。

## 3. Flow Matching 的采样过程

训练完成后，采样从基分布中抽取初始噪声 $\boldsymbol{x}_0\sim p_0$，然后在固定条件 $\boldsymbol{c}$ 下求解学习到的概率流 ODE：

$$
\frac{\mathrm{d}\boldsymbol{x}_t}{\mathrm{d}t}
=\boldsymbol{v}_\theta(\boldsymbol{x}_t,t,\boldsymbol{c}),
\qquad t:0\rightarrow1.
$$

若使用最简单的 Euler 方法，把 $[0,1]$ 划分为 $K$ 个时间点 $0=t_0<t_1<\cdots<t_K=1$，更新公式为

$$
\boldsymbol{x}_{t_{k+1}}
=\boldsymbol{x}_{t_k}
+(t_{k+1}-t_k)
\boldsymbol{v}_\theta
(\boldsymbol{x}_{t_k},t_k,\boldsymbol{c}).
$$

经过 $K$ 次网络评估后，$\boldsymbol{x}_{t_K}$ 就是生成样本。也可以使用中点法、Heun 方法、Runge–Kutta 方法或带误差控制的自适应 ODE 求解器，以更少的离散误差换取额外的单步计算。这里最重要的工程指标是神经网络函数评估次数 NFE，因为高阶求解器的一步可能调用网络多次。若学到的流接近直线且速度随时间变化平缓，少量 NFE 就可能达到较好结果；若路径弯曲、条件复杂或网络拟合误差较大，过度压缩步数会导致终点偏离数据流形。因此，并非所有的任务下 Flow Matching 都可以一步生成结果，一步或极少步效果通常来自路径设计、蒸馏、专门训练目标或特定任务下的数据结构。

在没有额外随机项时，这个 ODE 对给定的初始噪声和条件是确定的，但生成分布仍然可以是多模态的，因为不同的 $\boldsymbol{x}_0$ 会沿不同流线到达不同终点。需要多个候选时，只需并行采样多个初始噪声并分别积分。条件控制还可以在训练或推理阶段加强，例如用有条件与无条件速度的线性组合构造类似 classifier-free guidance 的速度场

$$
\boldsymbol{v}_{\mathrm{cfg}}
=(1+s)\boldsymbol{v}_\theta(\boldsymbol{x}_t,t,\boldsymbol{c})
-s\boldsymbol{v}_\theta(\boldsymbol{x}_t,t,\varnothing),
$$

其中 $s$ 控制条件服从程度；也可以在速度场中加入由安全代价、目标函数或约束势能产生的引导项。不过，引导过强会改变原本学习到的概率流，造成样本多样性下降、数值不稳定或越出训练分布。在自动驾驶等安全关键任务中，生成终点通常还要经过候选评分、碰撞检查、动力学可行性检查和轨迹平滑，而不能把 ODE 输出不加验证地直接交给执行器。由于连续流在适当正则条件下具有可逆性，也可以从 $t=1$ 反向积分回 $t=0$ 做编码或反演；若还需要显式似然，则应在积分状态的同时累计速度散度，但这会重新引入较高的计算成本，许多以生成或规划为目标的应用并不会在推理时计算它。

## 4. Flow Matching 的优势和不足

Flow Matching 最直接的优势是训练形式简单而稳定，训练时不需要运行 ODE，也不需要为每个样本计算 Jacobian 行列式或散度，因此容易复用成熟的神经网络、批训练和条件编码结构。第二个优势是概率路径具有较高自由度：扩散式高斯路径、线性位移插值、最优传输路径以及面向特定数据几何的路径都可以纳入同一框架，源分布也不一定永远局限于标准高斯；选择更合适的路径，往往能够减少采样时的 NFE。第三个优势是采样动力学由 ODE 给出，给定初始噪声后是确定且可逆的，既能自然地产生多样本，也便于做反演、编辑、条件引导和理论上的密度追踪。与经典的多步随机扩散采样相比，采用较直路径的 Flow Matching 经常可以用较少的网络调用得到有竞争力的样本，这一点对延迟敏感的机器人和智能驾驶尤为重要。

Flow Matching 仍有部分问题需要解决。首先，采样阶段仍受数值积分误差约束；线性条件路径并不保证学到的边缘流也完全笔直，不合理的端点耦合会造成交叉路径和高方差；确定性连续流在处理拓扑差异很大的分布时也可能需要复杂甚至非常陡峭的速度场。更重要的是，Flow Matching 学到的是数据分布和条件分布，不会自动保证安全、因果正确或满足数据内部潜在的物理规律；如果数据集本身存在分布不均或分布偏置，模型同样会继承这些问题。

## 5. Flow Matching 在智能驾驶领域的应用

在智能驾驶中，Flow Matching 最自然的应用方式是行为预测和轨迹规划，因为它们本质上都是条件分布生成问题。可以把未来 $H$ 个时刻的二维位置、航向、速度或控制量拼成轨迹向量 $\boldsymbol{\tau}\in\mathbb{R}^{H\times d}$，把摄像头与激光雷达形成的 BEV 特征、地图或车道结构、导航命令、交通灯、自车历史状态和周围参与者轨迹编码为条件 $\boldsymbol{c}$，然后学习

$$
p_{\mathrm{data}}(\boldsymbol{\tau}\mid\boldsymbol{c}).
$$

 训练时将真实驾驶轨迹 $\boldsymbol{\tau}_1$ 与噪声轨迹 $\boldsymbol{\tau}_0$ 插值，网络预测从噪声轨迹指向专家轨迹的条件速度；推理时从多个噪声初值出发，用很少的 ODE 步骤生成一组候选。不同初始噪声可以对应跟车、变道、超车、转弯或让行等不同模式，而条件编码会把这些模式限制在当前道路和交互语境中。系统随后根据碰撞风险、可行驶区域、路线一致性、规则遵守程度等进行评分与筛选，必要时再用二次规划或模型预测控制做动力学投影和平滑。这样，Flow Matching 负责从数据中学习“人类驾驶行为的多模态先验”，传统优化和规则模块负责提供“必须满足的安全与物理边界”，二者更适合形成互补关系。

一个有代表性的案例是 [GoalFlow](https://arxiv.org/abs/2503.05689)。该工作将 Flow Matching 用于端到端自动驾驶的多模态轨迹生成，通过图像与激光雷达融合得到场景特征，再从目标点词表中选择与场景一致的目标点，用目标点约束轨迹流向，并对生成候选进行评分。目标点在这里相当于把“向左绕行”“继续直行”等高层模式显式分开，Flow Matching 再负责生成每个模式内部连续、细致的轨迹，从而缓解无约束生成导致的轨迹发散和候选选择困难。论文报告了在 NAVSIM 上的结果，并展示了极少步生成的潜力。较新的 [FlowDrive](https://arxiv.org/abs/2509.21961) 预印本进一步把场景上下文条件下的轨迹规划写成 Rectified Flow，引入数据均衡来缓解驾驶数据中直行样本占主导、变道和交互样本稀缺的长尾问题，并在推理阶段调节生成多样性。由于后者属于较新的研究工作，其结果更适合被视为方法趋势和实验性证据，而不是已经完成大规模道路验证的成熟结论。

Flow Matching 还可以突破“只生成自车轨迹”的范围，统一建模周围参与者预测与自车响应。若把所有交通参与者的未来运动作为联合状态，速度场就能描述它们在同一场景条件下的相关演化，避免先独立预测其他车辆、再由规划器被动响应所造成的分布不一致。[Adaptive Time Step Flow Matching for Autonomous Driving Motion Planning](https://arxiv.org/abs/2602.10285) 探索了联合预测周围交通参与者与规划自车轨迹，并根据估计的积分难度自适应选择 ODE 评估次数，再通过轻量二次规划改善舒适性和动力学可行性。这个方向揭示了 Flow Matching 对实时系统很有价值的一点：简单场景可以少算几步，复杂交互场景可以多分配计算，而不必让所有样本共享同一推理预算。类似思想也可以用于占用流、场景演化和驾驶世界模型，即让模型学习 BEV 或潜空间状态在驾驶动作条件下的连续变化，再为规划器提供可查询的未来场景分布。

不过，从论文指标走向量产系统仍有明显距离。离线开环轨迹误差较低，不代表闭环行驶一定安全；生成模型可能在分布外天气、罕见施工、极端交互和传感器故障下给出外观平滑但语义错误的轨迹，这仍然是当前智能驾驶的重大挑战。

## 附录

Flow Matching 中提到：当网络使用平方损失预测一个随机目标时，最优回归函数是该目标在给定网络输入后的条件期望。

推导需要引入全期望公式，即：

$$
\mathbb{E}
\left[
\mathbb{E}[\boldsymbol{Y}\mid\boldsymbol{S}]
\right]=
\mathbb{E}[\boldsymbol{Y}].
$$

如果随机变量是离散的，这个公式可以直接展开推导。设 $S$ 的所有可能取值为 $s$，则

$$
\begin{aligned}
\mathbb{E}
\left[
\mathbb{E}[\boldsymbol{Y}\mid S]
\right]&=
\sum_s
\mathbb{E}[\boldsymbol{Y}\mid S=s]\,
\mathbb{P}(S=s)\\&=
\sum_s
\sum_{\boldsymbol{y}}
\boldsymbol{y}\,
\mathbb{P}(\boldsymbol{Y}=\boldsymbol{y}\mid S=s)\,
\mathbb{P}(S=s)\\&=
\sum_s
\sum_{\boldsymbol{y}}
\boldsymbol{y}\,
\mathbb{P}(\boldsymbol{Y}=\boldsymbol{y},S=s)\\&=
\sum_{\boldsymbol{y}}
\boldsymbol{y}\,
\mathbb{P}(\boldsymbol{Y}=\boldsymbol{y})=
\mathbb{E}[\boldsymbol{Y}].
\end{aligned}
$$

连续情形只是把求和换成积分。若联合密度存在，并允许交换积分顺序，则

$$
\begin{aligned}
\mathbb{E}
\left[
\mathbb{E}[\boldsymbol{Y}\mid S]
\right]&=
\int
\left(
\int
\boldsymbol{y}\,
p(\boldsymbol{y}\mid s)\,
\mathrm{d}\boldsymbol{y}
\right)
p_S(s)\,\mathrm{d}s\\&=
\int\!\!\int
\boldsymbol{y}\,
p(\boldsymbol{y},s)\,
\mathrm{d}\boldsymbol{y}\,\mathrm{d}s\\&=
\int
\boldsymbol{y}\,
p_{\boldsymbol{Y}}(\boldsymbol{y})\,
\mathrm{d}\boldsymbol{y}=
\mathbb{E}[\boldsymbol{Y}].
\end{aligned}
$$

全期望公式的物理意义可以用“先做局部平均，再做总体平均”来理解。观测 $S=s$ 把全部样本分成许多互不相同的子群，在每个子群内部先计算 $\mathbb{E}[\boldsymbol{Y}\mid S=s]$，再按照该子群出现的概率 $p_S(s)$ 加权，就会重新得到整体平均 $\mathbb{E}[\boldsymbol{Y}]$。在 Flow Matching 中，相当于先把所有在时刻 $t$ 经过同一位置 $\boldsymbol{x}$ 的条件路径找出来，计算它们的平均速度，再由中间状态分布决定各位置在总体中的权重。

现在考虑任意候选回归函数 $\boldsymbol{g}(\boldsymbol{S})$，并记 $\boldsymbol{\mu}(\boldsymbol{S})=\mathbb{E}[\boldsymbol{Y}\mid\boldsymbol{S}]$。将预测误差分解为

$$
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{Y}=
\left(
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})
\right)+
\left(
\boldsymbol{\mu}(\boldsymbol{S})-\boldsymbol{Y}
\right),
$$

平方并取期望可以得到

$$
\begin{aligned}
\mathbb{E}
\left[
\|\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{Y}\|_2^2
\right]={}&
\mathbb{E}
\left[
\|\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})\|_2^2
\right]\\&+
\mathbb{E}
\left[
\|\boldsymbol{Y}-\boldsymbol{\mu}(\boldsymbol{S})\|_2^2
\right]\\&+2\,
\mathbb{E}
\left[
\left(
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})
\right)^\top
\left(
\boldsymbol{\mu}(\boldsymbol{S})-\boldsymbol{Y}
\right)
\right].
\end{aligned}
$$

最后的交叉项为零，因为在给定 $\boldsymbol{S}$ 后，第一部分已经是确定量，而第二部分的条件均值为零。具体来说就是

$$
\begin{aligned}
&\mathbb{E}
\left[
\left(
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})
\right)^\top
\left(
\boldsymbol{\mu}(\boldsymbol{S})-\boldsymbol{Y}
\right)
\right]\\&=
\mathbb{E}
\left[
\mathbb{E}
\left[
\left(
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})
\right)^\top
\left(
\boldsymbol{\mu}(\boldsymbol{S})-\boldsymbol{Y}
\right)
\middle|
\boldsymbol{S}
\right]
\right]\\&=
\mathbb{E}
\left[
\left(
\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})
\right)^\top
\mathbb{E}
\left[
\boldsymbol{\mu}(\boldsymbol{S})-\boldsymbol{Y}
\mid
\boldsymbol{S}
\right]
\right]=0.
\end{aligned}
$$

因此得到平方损失的勾股分解

$$
\boxed{
\mathbb{E}
\left[
\|\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{Y}\|_2^2
\right]=
\mathbb{E}
\left[
\|\boldsymbol{g}(\boldsymbol{S})-\boldsymbol{\mu}(\boldsymbol{S})\|_2^2
\right]+
\mathbb{E}
\left[
\|\boldsymbol{Y}-\boldsymbol{\mu}(\boldsymbol{S})\|_2^2
\right].
}
$$

右边第二项是观测 $\boldsymbol{S}$ 之后仍然无法消除的条件随机性，与候选函数 $\boldsymbol{g}$ 无关；右边第一项则是预测函数相对于条件均值产生的额外误差。于是总体平方损失在且仅在 $\boldsymbol{g}(\boldsymbol{S})=\boldsymbol{\mu}(\boldsymbol{S})$ 几乎处处成立时达到最小值，即

$$
\boxed{
\boldsymbol{g}^*(\boldsymbol{S})=
\mathbb{E}[\boldsymbol{Y}\mid\boldsymbol{S}].
}
$$

从统计角度看，第二项也可以写成条件协方差的迹的平均，

$$
\mathbb{E}
\left[
\|\boldsymbol{Y}-\boldsymbol{\mu}(\boldsymbol{S})\|_2^2
\right]=
\mathbb{E}
\left[
\operatorname{tr}
\left(
\operatorname{Cov}(\boldsymbol{Y}\mid\boldsymbol{S})
\right)
\right],
$$

它表示即使使用无限容量模型，也无法从现有输入中解释的不可约误差。如果神经网络的函数族没有能力表示真实条件期望，那么训练只能在该函数族内部寻找最接近条件期望的近似，而不能保证得到精确的 $\mathbb{E}[\boldsymbol{Y}\mid\boldsymbol{S}]$。

## 参考文献

Rezende, Mohamed, [*Variational Inference with Normalizing Flows*](https://proceedings.mlr.press/v37/rezende15.html), ICML 2015。

Dinh, Sohl-Dickstein, Bengio, [*Density Estimation Using Real NVP*](https://openreview.net/forum?id=HkpbnH9lx), ICLR 2017。

Chen, Rubanova, Bettencourt, Duvenaud, [*Neural Ordinary Differential Equations*](https://proceedings.neurips.cc/paper/2018/hash/69386f6bb1dfed68692a24c8686939b9-Abstract.html), NeurIPS 2018。

Grathwohl, Chen, Bettencourt, Sutskever, Duvenaud, [*FFJORD: Free-Form Continuous Dynamics for Scalable Reversible Generative Models*](https://openreview.net/forum?id=rJxgknCcK7), ICLR 2019。

Lipman, Chen, Ben-Hamu, Nickel, Le, [*Flow Matching for Generative Modeling*](https://openreview.net/forum?id=PqvMRDCJT9t), ICLR 2023。

Tong, Fatras, Malkin, Huguet, Zhang, Rector-Brooks, Wolf, Bengio, [*Improving and Generalizing Flow-Based Generative Models with Minibatch Optimal Transport*](https://openreview.net/forum?id=CD9Snc73AW), TMLR 2024。

Albergo, Vanden-Eijnden, [*Building Normalizing Flows with Stochastic Interpolants*](https://openreview.net/forum?id=li7qeBbCR1t), ICLR 2023。

Liu, Gong, Liu, [*Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow*](https://openreview.net/forum?id=XVjTT1nw5z), ICLR 2023。

Pooladian, Ben-Hamu, Domingo-Enrich, Amos, Lipman, Chen, [*Multisample Flow Matching: Straightening Flows with Minibatch Couplings*](https://proceedings.mlr.press/v202/pooladian23a.html), ICML 2023。

Lee, Kim, Ye, [*Minimizing Trajectory Curvature of ODE-Based Generative Models*](https://proceedings.mlr.press/v202/lee23j.html), ICML 2023。

Lipman, Havasi, Holderrieth, Shaul, Le, Karrer, Chen, Lopez-Paz, Ben-Hamu, Gat, [*Flow Matching Guide and Code*](https://arxiv.org/abs/2412.06264), arXiv 2024。

Benamou, Brenier, [*A Computational Fluid Mechanics Solution to the Monge–Kantorovich Mass Transfer Problem*](https://doi.org/10.1007/s002110050002), Numerische Mathematik 2000。

Anderson, [*Reverse-Time Diffusion Equation Models*](https://doi.org/10.1016/0304-4149(82)90051-5), Stochastic Processes and their Applications 1982。

Hyvärinen, [*Estimation of Non-Normalized Statistical Models by Score Matching*](https://jmlr.org/papers/v6/hyvarinen05a.html), JMLR 2005。

Vincent, [*A Connection Between Score Matching and Denoising Autoencoders*](https://direct.mit.edu/neco/article/23/7/1661/7677/A-Connection-Between-Score-Matching-and-Denoising), Neural Computation 2011。

Sohl-Dickstein, Weiss, Maheswaranathan, Ganguli, [*Deep Unsupervised Learning Using Nonequilibrium Thermodynamics*](https://arxiv.org/abs/1503.03585), ICML 2015。

Song, Ermon, [*Generative Modeling by Estimating Gradients of the Data Distribution*](https://arxiv.org/abs/1907.05600), NeurIPS 2019。

Ho, Jain, Abbeel, [*Denoising Diffusion Probabilistic Models*](https://arxiv.org/abs/2006.11239), NeurIPS 2020。

Song, Sohl-Dickstein, Kingma, Kumar, Ermon, Poole, [*Score-Based Generative Modeling through Stochastic Differential Equations*](https://arxiv.org/abs/2011.13456), ICLR 2021。

Song, Meng, Ermon, [*Denoising Diffusion Implicit Models*](https://arxiv.org/abs/2010.02502), ICLR 2021。

Kallenberg, [*Foundations of Modern Probability*](https://link.springer.com/book/10.1007/978-3-030-61871-1), Springer 2021。

Durrett, [*Probability: Theory and Examples*](https://www.cambridge.org/core/books/probability/DD9A1907F810BB14CCFF022CDFC5677A), Cambridge University Press 2019。

Bishop, [*Pattern Recognition and Machine Learning*](https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/), Springer 2006。

Xing, Zhang, Hu, Jiang, He, Zhang, Long, Yin, [*GoalFlow: Goal-Driven Flow Matching for Multimodal Trajectories Generation in End-to-End Autonomous Driving*](https://openaccess.thecvf.com/content/CVPR2025/html/Xing_GoalFlow_Goal-Driven_Flow_Matching_for_Multimodal_Trajectories_Generation_in_End-to-End_CVPR_2025_paper.html), CVPR 2025。

Wang, Taş, Steiner, Stiller, [*FlowDrive: Moderated Flow Matching with Data Balancing for Trajectory Planning*](https://arxiv.org/abs/2509.21961), arXiv 2025。

Trivedi, Li, Elnoor, Ciftci, Singh, D'sa, Bae, Isele, Padir, Tariq, [*Adaptive Time Step Flow Matching for Autonomous Driving Motion Planning*](https://arxiv.org/abs/2602.10285), arXiv 2026。

Liao, Chen, Yin, Jiang, Wang, Yan, Zhang, Li, Zhang, Zhang, Wang, [*DiffusionDrive: Truncated Diffusion Model for End-to-End Autonomous Driving*](https://openaccess.thecvf.com/content/CVPR2025/html/Liao_DiffusionDrive_Truncated_Diffusion_Model_for_End-to-End_Autonomous_Driving_CVPR_2025_paper.html), CVPR 2025。

Zheng, Liang, Zheng, Zheng, Mao, Li, Gu, Ai, Li, Zhan, Liu, [*Diffusion-Based Planning for Autonomous Driving with Flexible Guidance*](https://openreview.net/forum?id=wM2sfVgMDH), ICLR 2025。

Chen, Wu, Chitta, Jaeger, Geiger, Li, [*End-to-End Autonomous Driving: Challenges and Frontiers*](https://arxiv.org/abs/2306.16927), IEEE TPAMI 2024。

Dauner, Hallgarten, Li, Weng, Huang, Yang, Li, Gilitschenski, Ivanovic, Pavone, Geiger, Chitta, [*NAVSIM: Data-Driven Non-Reactive Autonomous Vehicle Simulation and Benchmarking*](https://proceedings.neurips.cc/paper_files/paper/2024/hash/32768f7faf1995026ef9821c696f3404-Abstract-Datasets_and_Benchmarks_Track.html), NeurIPS 2024。
