---
title: "Plücker Ray 学习笔记"
date: 2026-11-16
tags: ["自动驾驶", "CV", "数学"]
categories: ["自动驾驶"]
description: "梳理 Plücker 坐标的定义和边积运算，以及它在智能驾驶（线特征参数化、相机 Plücker 编码）和图形学判交测试里的用法"
toc: true
math: true
---

## 1. 背景

直线是三维空间中最基本的几何基元之一，多个领域都需要对它建立高效的表示与运算。在计算机图形学中，光线追踪的核心步骤是射线与三角形、包围盒等基元的求交测试；在智能驾驶的定位与建图（SLAM）中，车道线、灯杆、护栏、建筑棱边等线特征是低纹理场景下点特征的重要补充；在以视频生成模型为基础的世界模型（用生成模型模拟环境并向前推演）中，相机位姿需要被转化为网络可理解的条件信号，而相机成像在几何上正是一组从相机中心出发的射线。

这些任务形式各不相同，对直线表示提出的要求却是一致的：所关心的往往并非直线经过的具体点，而是直线之间的相对位置，即射线是否穿过某个三角形、线特征在相邻视角之间的投影是否一致、相机位姿能否被逐像素地编码为射线。然而，直线的常用表示并不能满足这一要求。一条三维直线仅有 4 个自由度（方向 2 个，给定方向后位置 2 个），而两点表示与“点 + 方向”表示都要用 6 个参数，存在沿直线滑动的冗余，并且在判定两条直线的相对位置时需要逐次构造辅助向量；斜率截距式则需将空间直线拆分为多个平面投影处理，退化情形繁多。更本质的问题在于，这些表示都以位置为中心，缺少对方向性关系的直接代数刻画。

Plücker 坐标正是针对这一需求提出的直线表示：用一个方向向量和一个力矩向量组成六元组，两条直线的相对位置（即是否共面、绕向如何）由一次双线性运算直接给出，且运算结果带符号。这一表示由 Julius Plücker 在 19 世纪 60 年代建立线几何（line geometry）时引入；20 世纪 90 年代末，图形学界重新发掘了这一表示，构造出免除法、纯符号判定的射线求交测试；2020 年代前后，它又进入视觉与智能驾驶领域，形成两条主要的应用线索：一是 SLAM 与三维重建中线特征的参数化，二是世界模型中相机射线的编码，即“Plücker 编码”。

本文的组织如下：第 2、3 节给出 Plücker 坐标的定义与核心运算（边积）；第 4 节回顾图形学中的判交应用；第 5、6 节是重点，分别讨论智能驾驶中线特征的参数化与优化，以及面向神经网络的 Plücker 编码；第 7 节澄清常见困惑，第 8、9 节梳理历史脉络并总结。

## 2. 定义：方向向量与力矩

设直线 $L$ 经过点 $\boldsymbol{p}$，方向为 $\boldsymbol{d} \neq \boldsymbol{0}$，其 Plücker 坐标定义为六元组

$$
L = (\boldsymbol{d};\ \boldsymbol{m}), \qquad \boldsymbol{m} = \boldsymbol{p} \times \boldsymbol{d}
$$

**$\boldsymbol{m}$ 不依赖 $\boldsymbol{p}$ 的选取。** 取线上任意一点 $\boldsymbol{p}' = \boldsymbol{p} + t\boldsymbol{d}$，则

$$
\boldsymbol{p}' \times \boldsymbol{d} = (\boldsymbol{p} + t\boldsymbol{d}) \times \boldsymbol{d} = \boldsymbol{p} \times \boldsymbol{d}
$$

这表明，点沿直线滑动时力矩不变。由此立即可得常用的两点式：过 $\boldsymbol{p}$、$\boldsymbol{q}$ 两点的直线可表示为

$$
\boldsymbol{d} = \boldsymbol{q} - \boldsymbol{p}, \qquad \boldsymbol{m} = \boldsymbol{p} \times \boldsymbol{d} = \boldsymbol{p} \times \boldsymbol{q}
$$

**$\boldsymbol{m}$ 可直观理解为力矩。** 将 $\boldsymbol{d}$ 视为沿直线作用的力，则 $\boldsymbol{m}$ 即该力对原点的力矩，这正是静力学中的表示。由此可直接得出三个几何事实：

- $\boldsymbol{m}$ 垂直于原点与直线张成的平面，是它的法向；
- $|\boldsymbol{m}| = |\boldsymbol{d}| \cdot \mathrm{dist}(O, L)$，模长给出了直线到原点的距离；
- 直线过原点当且仅当 $\boldsymbol{m} = \boldsymbol{0}$。

面向优化的工作（第 5 节的 LIMAP）通常将 $\boldsymbol{d}$ 归一化为单位向量，此时 $|\boldsymbol{m}|$ 即为直线到原点的距离；下文所有公式对任意非零 $\boldsymbol{d}$ 均成立。

**自由度的计算。** Plücker 坐标含 6 个数，但整体可相差一个非零缩放因子（齐次性）：$(\boldsymbol{d};\ \boldsymbol{m}) \sim \lambda(\boldsymbol{d};\ \boldsymbol{m})$；且恒有约束

$$
\boldsymbol{d} \cdot \boldsymbol{m} = 0
$$

（因为 $\boldsymbol{m} = \boldsymbol{p} \times \boldsymbol{d} \perp \boldsymbol{d}$）。因此实际自由度为 $6 - 1 - 1 = 4$，与直线本身一致。以射影几何的语言表述：直线对应五维射影空间 $\mathbb{P}^5$ 中的点，全体直线落在二次曲面 $\boldsymbol{d} \cdot \boldsymbol{m} = 0$ 上，文献中称为 Klein 二次曲面（Klein quadric，也作 Plücker quadric）。此外还可观察到：将线上两点的齐次坐标排成 $2 \times 4$ 矩阵，其六个 $2 \times 2$ 子式按固定顺序排列即得 Plücker 坐标，这正是将直线映射为 $\mathbb{P}^5$ 中点的标准做法，而 $\boldsymbol{d} \cdot \boldsymbol{m} = 0$ 是这些子式之间唯一的二次关系。

**射线的 Plücker 坐标。** 射线由起点 $\boldsymbol{o}$ 与方向 $\boldsymbol{d}$ 确定，将其所在的无限直线（后文称支撑直线）表示为 Plücker 坐标即可：

$$
R = (\boldsymbol{d};\ \boldsymbol{m}_R), \qquad \boldsymbol{m}_R = \boldsymbol{o} \times \boldsymbol{d}
$$

注意：起点沿射线自身移动（$\boldsymbol{o} \to \boldsymbol{o} + t\boldsymbol{d}$）不改变 Plücker 坐标。因此这 6 个数描述的是“射线所在的那条直线（含朝向的选取）”，而射线的起点位置与延伸范围并不包含在这 6 个数中。该限制将在第 4 节引出一个实际问题。

## 3. 核心运算：边积

两条直线 $L_1 = (\boldsymbol{d}_1;\ \boldsymbol{m}_1)$，$L_2 = (\boldsymbol{d}_2;\ \boldsymbol{m}_2)$，定义边积（side product，也称置换内积、Plücker 内积）：

$$
\pi(L_1, L_2) = \boldsymbol{d}_1 \cdot \boldsymbol{m}_2 + \boldsymbol{d}_2 \cdot \boldsymbol{m}_1
$$

它是对称的双线性型。将 $\boldsymbol{m}_i = \boldsymbol{p}_i \times \boldsymbol{d}_i$ 代入，并利用混合积的轮换恒等式，可整理为如下形式：

$$
\pi(L_1, L_2) = (\boldsymbol{p}_1 - \boldsymbol{p}_2) \cdot (\boldsymbol{d}_1 \times \boldsymbol{d}_2)
$$

其中 $\boldsymbol{p}_1, \boldsymbol{p}_2$ 为两线上各自任取的点。由该形式立即可得这一方法的核心定理：

$$
\pi(L_1, L_2) = 0 \iff L_1, L_2 \text{ 共面} \iff L_1, L_2 \text{ 相交或平行}
$$

证明：若两线共面，公垂方向 $\boldsymbol{d}_1 \times \boldsymbol{d}_2$（或平行时为零向量）垂直于面内的 $\boldsymbol{p}_1 - \boldsymbol{p}_2$，故 $\pi = 0$；反之，若 $\boldsymbol{d}_1 \times \boldsymbol{d}_2 \neq \boldsymbol{0}$ 且 $\pi = 0$，则 $\boldsymbol{p}_1 - \boldsymbol{p}_2$ 位于 $\boldsymbol{d}_1, \boldsymbol{d}_2$ 张成的平面内，两线共面；若 $\boldsymbol{d}_1 \times \boldsymbol{d}_2 = \boldsymbol{0}$，两线平行，而平行线必然共面。作为推论，还可得到异面直线的距离公式：

$$
\mathrm{dist}(L_1, L_2) = \frac{|\pi(L_1, L_2)|}{|\boldsymbol{d}_1 \times \boldsymbol{d}_2|}
$$

由于 $\boldsymbol{d}_1 \times \boldsymbol{d}_2$ 即公垂线方向，$\pi$ 恰为位移在该方向上的带符号投影。以射影几何的语言可概括为：边积是 Klein 二次曲面固有的一个配对，两个 Plücker 点的配对值为零，恰好对应两线共面（射影几何中称之为两个点关于该二次曲面共轭）。

**符号的几何意义。** 固定一条有向直线（例如射线 $R$），$\pi(R, L)$ 的正负号是一个绕向判定：沿 $R$ 的方向观察，$L$ 按逆时针方向还是按顺时针方向绕过 $R$。任一直线的方向翻转，符号随之翻转；取零则说明两线恰好共面。一次运算即可给出正、负、零三种结果，后文所有判交测试均利用该符号信息。

**射线对有向边的边积。** 设边从 $\boldsymbol{A}$ 指向 $\boldsymbol{B}$，即 $\boldsymbol{e} = \boldsymbol{B} - \boldsymbol{A}$。代入定义整理，可得

$$
\pi(R, E) = \boldsymbol{d} \cdot \bigl((\boldsymbol{A} - \boldsymbol{o}) \times \boldsymbol{e}\bigr) = \det[\boldsymbol{d},\ \boldsymbol{A} - \boldsymbol{o},\ \boldsymbol{B} - \boldsymbol{o}]
$$

它等于三个向量 $\boldsymbol{d},\ \boldsymbol{A} - \boldsymbol{o},\ \boldsymbol{B} - \boldsymbol{o}$ 的混合积，绝对值是四面体 $O,\ O + \boldsymbol{d},\ A,\ B$ 体积的 6 倍，符号则指示 $\boldsymbol{B}$ 位于平面 $(\boldsymbol{o}, \boldsymbol{A}, \boldsymbol{d})$ 的哪一侧。图形学文献（Mahovsky–Wyvill、Platis–Theoharis）习惯用相差一个正负号的版本

$$
\tau = \boldsymbol{d} \cdot \bigl(\boldsymbol{e} \times (\boldsymbol{A} - \boldsymbol{o})\bigr) = -\pi(R, E)
$$

后文沿用该习惯，判定规则一律以 $\tau$ 叙述（由于所有规则仅依赖“同号/异号”，对整体符号翻转不敏感）。

## 4. 图形学中的应用：以符号判定实现判交

### 4.1 射线–三角形：三个边积的判定

设三角形顶点 $\boldsymbol{p}_0, \boldsymbol{p}_1, \boldsymbol{p}_2$ 绕法向 $\boldsymbol{n} = \tfrac{1}{2}(\boldsymbol{p}_1 - \boldsymbol{p}_0) \times (\boldsymbol{p}_2 - \boldsymbol{p}_0)$ 逆时针排列，有向边沿顶点循环方向取 $\boldsymbol{e}_i = \boldsymbol{p}_{i+1} - \boldsymbol{p}_i$（下标模 3）。对每条边计算一个数：

$$
\tau_i = \boldsymbol{d} \cdot \bigl(\boldsymbol{e}_i \times (\boldsymbol{p}_i - \boldsymbol{o})\bigr), \qquad i = 0, 1, 2
$$

判定规则（Platis–Theoharis 论文中的表述）：

- 三个 $\tau_i$ 全部 $\geq 0$ 且不全为零：支撑直线从正面（$\boldsymbol{n}$ 一侧）穿过三角形；
- 全部 $\leq 0$ 且不全为零：从背面穿过；
- 有正有负：不穿过；
- 全为零：射线与三角形共面，属于退化情形，另行处理。

{{< algo title="Plücker 射线–三角形同侧测试" input="射线 (o, d)；三角形顶点 p0、p1、p2（绕法向逆时针）" output="支撑直线是否穿过三角形（正面 / 背面 / 未命中）" caption="每条边一次叉积一次点积，无除法、无矩阵运算" >}}
对 i = 0, 1, 2（下标模 3）：
    τ_i ← d · ((p_{i+1} − p_i) × (p_i − o))
若三个 τ_i 全 ≥ 0 且不全为零 → 正面命中
若三个 τ_i 全 ≤ 0 且不全为零 → 背面命中
有正有负 → 未命中
（要成为完整的射线测试，还需另行计算交点参数 t 并检查 t ∈ [t_min, t_max]）
{{< /algo >}}

**为什么有效：沿射线方向投影。** 从这一视角最容易阐明原理。取与 $\boldsymbol{d}$ 垂直的平面，将整个场景沿 $\boldsymbol{d}$ 投影到该平面（投影基 $\boldsymbol{u}, \boldsymbol{v}$ 满足 $\boldsymbol{u} \times \boldsymbol{v} = \boldsymbol{d}/|\boldsymbol{d}|$）。射线变为一个点，三角形变为一个二维三角形。直接展开可以验证（撇号表示投影后的二维坐标，如 $e'_{i,x} = \boldsymbol{e}_i \cdot \boldsymbol{u}$）：

$$
\tau_i = |\boldsymbol{d}| \cdot \bigl( e'_{i,x}\, (p'_{i,y} - o'_y) - e'_{i,y}\, (p'_{i,x} - o'_x) \bigr)
$$

右边括号正是二维的边函数（edge function）。而“点是否在三角形内”的二维判据就是三个边函数同号。因此，Plücker 射线–三角形测试本质上就是沿射线方向的二维点在三角形内测试，只是既无需实际执行投影，也无需挑选主平面和处理投影退化。光栅化中的 edge function、教材中的点在三角形内判定，与 $\tau_i$ 是同一个判定从二维到三维的推广；退化情形（点在边上）的处理方式也因此与二维版本完全一致，按“命中”处理即可。沿射线方向观察，$\tau_i$ 的正负号给出第 $i$ 条有向边绕射线的方式：正为逆时针，负为顺时针，零为相交或平行。

**与 Möller–Trumbore 的关系。** 在 Möller–Trumbore 的原始记号中（$\boldsymbol{e}_1 = \boldsymbol{p}_1 - \boldsymbol{p}_0$，$\boldsymbol{e}_2 = \boldsymbol{p}_2 - \boldsymbol{p}_0$，重心坐标 $u, v$ 对应顶点 $\boldsymbol{p}_1, \boldsymbol{p}_2$），直接计算可以验证三个关系：

$$
\det = \boldsymbol{e}_1 \cdot (\boldsymbol{d} \times \boldsymbol{e}_2) = \tau_0 + \tau_1 + \tau_2, \qquad
u = \frac{\tau_2}{\det}, \qquad
v = \frac{\tau_0}{\det}
$$

这表明，Möller–Trumbore 的行列式是三个 Plücker 边积之和，$u$、$v$ 的分子即为其中两个边积。它将三个 $\tau_i$ 中重复出现的公共项合并后一次算出，再除以行列式得到重心坐标和 $t$。因此，广为人知的 MT 算法与文献中的 Plücker 测试是同一算法的两种写法，MT 甚至更完整（它同时给出了 $t$ 的计算）。Platis–Theoharis 还指出了更深一层（这一观察在原文中归于 Ray Jones 2000 年的 RTN 文章）：三个 $\tau_i$ 本身就是交点的未归一化重心坐标（$\boldsymbol{e}_i$ 对面的顶点 $\boldsymbol{p}_{i+2}$ 的权重是 $\tau_i / \sum_j \tau_j$，下标模 3），这解释了 MT 为何能顺带得到重心坐标：它自始至终计算的就是 Plücker 边积。

### 4.2 射线–盒：只测轮廓棱

Mahovsky 和 Wyvill 2004 年的论文将同样的思想应用于轴对齐包围盒（AABB）。如果直接类推三角形测试、对盒的 12 条棱都要求符号一致，则会落入 4.3 节所述的误解；他们的做法是只测轮廓棱：按射线方向分量的正负将射线分为 8 类（M 表示分量为负、P 为正，按 x、y、z 顺序，记为 MMM、MMP 等），每一类只测 12 条棱中的 6 条，这 6 条是盒沿该方向投影为凸六边形后的 6 条边。每个边积都要满足对应的不等式（有的要求为正，有的要求为负），全部通过才判定为命中。由于棱是轴对齐的，每条棱的 Plücker 坐标大量分量为零，边积退化为很少的几项。以棱 $FE$（从 $(x_0, y_1, z_1)$ 沿 $-\boldsymbol{y}$ 方向）为例：

$$
\pi(R, FE) = d_x (z_1 - o_z) + d_z (o_x - x_0)
$$

此时仅剩两个乘积项。

该测试存在两方面的限制。其一，这是“双向无限长”的线测试：原文明确指出，Plücker 测试假设射线在两个方向上都无限长；要判断盒是否在射线正方向上，需要另加起点检查（MMM 类：$o_x > x_0$、$o_y > y_0$、$o_z > z_0$，闭不等号版本恰好等价于出射参数 $t \geq 0$，两者只差起点恰好落在边界面上的退化情形）；交点距离 $t$ 同样不在测试之中，需要时另行计算。其二，性能结论有时代背景：论文在 Pentium 4 和 Pentium III 上测得（不需要距离信息时）比当时的标准 slab 测试（对包围盒三对平行面各求一个 $t$ 区间再取交集的标准算法）最多快 93%，还在一个真实光线追踪器（C# 实现）中观察到 2 到 2.5 倍的渲染加速；现代 CPU 上分支更规整、运算量更小的 slab 测试（尤其 Williams 等人 2005 年的无除法版本）一般更快。今天这个算法的价值更多体现在教学意义与鲁棒性上：纯符号运算、无除法、6 个棱判定相互独立，具有天然的并行性。

### 4.3 一个常见误解：凸体不能“全体棱同号”

“三角形测试是所有边同号，所以凸多面体也该是所有边同号”：前半句正确，后半句错误，且很容易被想当然地写进代码。对四面体或盒这样的三维凸体，穿过体中心的直线绕不同棱的绕向本就不同：沿 $\boldsymbol{y}$ 轴穿过盒中心的直线，绕某条 $\boldsymbol{x}$ 方向的棱为逆时针，绕另一条则为顺时针。因此“全体棱符号一致”的命中直线并不存在，正确的推广有两条途径：

- 按面分组（Platis–Theoharis 的四面体算法）：对每个面做 4.1 的三条边积测试。某个面的三个边积全 $\geq 0$ 或全 $\leq 0$，它就是穿入面或穿出面；直线与凸体相交当且仅当存在这样的面。四面体的 12 条有向边被两个面以相反方向共享，12 个边积只需计算 6 个，其余 6 个取相反数。他们基于这一思路构造出比 Haines 经典凸多面体裁剪算法更快的四面体测试，还能直接给出穿入、穿出点的重心坐标。
- 取投影轮廓（Mahovsky–Wyvill 对盒的做法）：沿射线方向，凸体的投影是凸多边形，其边恰是某些棱的投影，检验这些轮廓棱即可。

对凸多边形（二维面，如三角形、portal，即场景中房间之间的开口多边形）$P$，有一条更一般的定理：穿过 $P$ 的直线集合在 Plücker 坐标空间中是一个凸区域，$P$ 的每条有向边贡献一个线性半空间，全部相交就得到这个区域。Teller 在博士论文中将该定理用于 portal 序列的“刺穿线”计算，Nirenstein 等人据此实现精确的 from-region 可见性裁剪（判断整个区域而非单个视点的可见性），Bittner 把整套方法组织成层次化算法。这条定理是可视性文献中反复使用的基本结果，它把“哪些直线能穿过哪些面”变成 Plücker 空间中的半空间交问题。

## 5. 智能驾驶应用一：线特征的参数化与优化

### 5.1 线特征的引入

智能驾驶的定位与建图（SLAM）中，直线特征广泛存在：车道线、道路边沿、灯杆、护栏、楼宇的棱。高速公路、隧道这类场景往往纹理很少，角点特征不足，而线特征数量多且稳定，因此“点 + 线”的 SLAM 在低纹理场景中比纯点方案更鲁棒。代表工作有双目的 PL-SLAM（2019）和单目视觉惯性里程计（VIO）的 PL-VINS（2020）。

把一条三维线段直接当作两个端点 $\boldsymbol{p}_s, \boldsymbol{p}_e$ 进行优化，存在两个问题：

1. 端点不可靠。视角改变或发生遮挡时，线段在图像中的可见范围随之改变，两个视角提取到的“端点”往往不是同一条三维线的同一位置。PL-VINS 明确以此为理由放弃端点，改用无限直线。
2. 参数冗余。一条无限直线只有 4 个自由度，两个端点却有 6 个：两个点都能沿直线滑动，表示不唯一。

Plücker 坐标正好把“无限直线”和“线段端点”解耦。LIMAP（CVPR 2023）的做法是：先把每条观测线段转换为 4 自由度的无限直线（用 Plücker 坐标）参与联合优化，再把两端按图像中观测到的线段范围回投，恢复为线段。

### 5.2 为什么不能直接优化这 6 个数

$(\boldsymbol{d};\ \boldsymbol{m})$ 有 6 个数、4 个自由度，直接将其作为优化变量，$\boldsymbol{d} \cdot \boldsymbol{m} = 0$ 这一约束要么每步都要重新投影，要么会被数值误差破坏。Bartoli 与 Sturm 在 2005 年的线段运动恢复结构（structure-from-motion）论文中给出了标准解法，即正交表示（orthonormal representation）：用两个旋转矩阵参数化 Plücker 坐标，约束自动成立。取 $\boldsymbol{d}$ 为单位向量（LIMAP 的约定），令

$$
\boldsymbol{U} = \begin{pmatrix} \boldsymbol{d} & \dfrac{\boldsymbol{m}}{\|\boldsymbol{m}\|} & \dfrac{\boldsymbol{d} \times \boldsymbol{m}}{\|\boldsymbol{d} \times \boldsymbol{m}\|} \end{pmatrix} \in \mathrm{SO}(3), \qquad
\boldsymbol{W} = \begin{pmatrix} w_1 & w_2 \\ -w_2 & w_1 \end{pmatrix} \in \mathrm{SO}(2)
$$

$$
w_1 = \frac{1}{\sqrt{1 + \|\boldsymbol{m}\|^2}}, \qquad w_2 = \frac{\|\boldsymbol{m}\|}{\sqrt{1 + \|\boldsymbol{m}\|^2}}
$$

记 $\boldsymbol{U}$ 的三列为 $\boldsymbol{u}_1, \boldsymbol{u}_2, \boldsymbol{u}_3$；反之，由 $(\boldsymbol{U}, \boldsymbol{W})$ 恢复 Plücker 坐标的公式为

$$
\boldsymbol{d} = \boldsymbol{u}_1, \qquad \boldsymbol{m} = \frac{w_2}{w_1}\, \boldsymbol{u}_2 = \|\boldsymbol{m}\|\, \boldsymbol{u}_2
$$

$\boldsymbol{U}$ 的三列将方向和力矩的朝向纳入一个旋转（3 个自由度），$\boldsymbol{W}$ 表示力矩的大小（1 个自由度，$\boldsymbol{d}$ 为单位向量时就是直线到原点的距离），合计恰为 4 个。直线过原点（$\boldsymbol{m} = \boldsymbol{0}$）时 $\boldsymbol{U}$ 的后两列无定义，构成这套参数化的奇异情形，实践中通常整体平移世界坐标系来规避。实现时 $\boldsymbol{U}$ 采用四元数、$\boldsymbol{W}$ 采用二维齐次参数化，放入 Ceres 这类非线性最小二乘库（LIMAP 的做法）。PL-VINS 在滑动窗口优化（只优化最近若干帧）中对线特征采用的也是同一参数化：以四参数正交表示迭代更新线状态，残差按 Plücker 坐标投影计算。

### 5.3 投影与残差：Plücker 坐标的矩阵形式

把 Plücker 坐标写为 $4 \times 4$ 反对称的 Plücker 矩阵（$[\boldsymbol{m}]_\times$ 表示由 $\boldsymbol{m}$ 生成的反对称矩阵）：

$$
\boldsymbol{L} = \begin{pmatrix} [\boldsymbol{m}]_\times & \boldsymbol{d} \\ -\boldsymbol{d}^\top & 0 \end{pmatrix}
$$

它等于线上两点齐次坐标的外积差：取线上两点 $\boldsymbol{p}, \boldsymbol{q}$（齐次坐标 $\boldsymbol{X} = (\boldsymbol{p}, 1)$、$\boldsymbol{Y} = (\boldsymbol{q}, 1)$，方向 $\boldsymbol{d} = \boldsymbol{q} - \boldsymbol{p}$），则恰好有 $\boldsymbol{L} = \boldsymbol{Y}\boldsymbol{X}^\top - \boldsymbol{X}\boldsymbol{Y}^\top$。于是三维直线经 $3 \times 4$ 投影矩阵 $\boldsymbol{P}$ 投影到图像，可表示为

$$
[\boldsymbol{l}]_\times \propto \boldsymbol{P}\, \boldsymbol{L}\, \boldsymbol{P}^\top
$$

$\boldsymbol{l}$ 是图像平面上的二维直线，满足 $\boldsymbol{l}^\top (u, v, 1) = 0$。推导只需一步：线上两点的投影 $\boldsymbol{P}\boldsymbol{X}$、$\boldsymbol{P}\boldsymbol{Y}$ 的叉积即为 $\boldsymbol{l}$，而任意向量满足 $[\boldsymbol{a} \times \boldsymbol{b}]_\times = \boldsymbol{b}\boldsymbol{a}^\top - \boldsymbol{a}\boldsymbol{b}^\top$，代入整理即得。这套公式在 Hartley–Zisserman 的教科书中有记载，LIMAP 的附录给出了适合工程实现的整理版本。

有了投影，残差即可直接构造：图像中观测到一条二维线段，将线特征的 Plücker 直线按当前位姿投影为 $\boldsymbol{l}$，残差取观测线段上的点（端点或中点，各家略有出入）到这条投影直线的垂直距离（point-to-line 距离），参与和点特征相同的 BA（bundle adjustment，把相机位姿和三维结构一起放进最小二乘）优化。LIMAP 还给出了一个便于使用的三维公式，即任意一点 $\boldsymbol{p}$ 到 Plücker 直线的垂足，无需求解最小二乘：

$$
\boldsymbol{m}_p = \boldsymbol{m} + \boldsymbol{d} \times \boldsymbol{p}, \qquad
\boldsymbol{p}_\perp = \boldsymbol{p} + \boldsymbol{d} \times \boldsymbol{m}_p
$$

（$\boldsymbol{m}_p$ 为直线关于点 $\boldsymbol{p}$ 的力矩；$\boldsymbol{d}$ 取单位向量。）

### 5.4 效果与延伸

PL-VINS 在公开数据集上比 VINS-Mono 的定位误差低 12–16%（相同的位姿更新频率）；LIMAP 能从多视角图像重建出大规模的 3D 线地图，论文给出的应用是视觉定位和 BA 精化。PlückerNet（CVPR 2021）更进一步把“两组 3D 线的配准”转化为学习问题：MLP 直接以 6 维 Plücker 表示为输入提取每条线的特征，再用最优传输（optimal transport，一种求两组元素间软对应的方法）层估计两组线之间的对应，进而解出相对位姿。由此可见，在这一类工作中，Plücker 坐标的价值不在于减少参数个数，而在于叉积、投影、距离这些几何运算在其上均有闭式表达式。

## 6. 智能驾驶应用二：Plücker 编码

### 6.1 相机成像的射线视角

相机成像可以逆向理解：每个像素对应一条从相机中心 $\boldsymbol{o}$ 出发的射线。射线也是直线，同样可以表示为 Plücker 坐标。2021 年的 Light Field Networks 研究如何用神经网络表示一个场景的光场（所有光线的集合）：函数输入是射线，输出是颜色。该工作将射线的参数化选为 6 维 Plücker 坐标。论文中明确指出：这些射线所在的有向直线只有 4 个自由度（第 2 节已算过），6 维 Plücker 看似过参数化，但依然适用。事实上，神经网络的输入并不要求最小参数化。Plücker 编码作为网络输入的做法即源于此。

### 6.2 CameraCtrl：逐像素的相机姿态编码

相机控制是视频生成模型的关键能力，也是世界模型的核心接口之一。CameraCtrl（ICLR 2025）给预训练视频扩散模型附加了一个相机控制模块，输入不是欧拉角或外参矩阵，而是逐像素的 Plücker 嵌入（即标题所说的“Plücker 编码”；论文把来源追溯到 Sitzmann 等人 2021 年的射线参数化）：

$$
\boldsymbol{p}_{u,v} = \bigl(\boldsymbol{o} \times \boldsymbol{d}_{u,v},\ \boldsymbol{d}_{u,v}\bigr) \in \mathbb{R}^6
$$

其中 $\boldsymbol{d}_{u,v}$ 是穿过像素 $(u, v)$ 的单位射线方向（力矩在前、方向在后，仅排列顺序与本文不同，内容一致）。整段视频的相机轨迹即为一组这样的嵌入：$\boldsymbol{P} \in \mathbb{R}^{n \times 6 \times h \times w}$，与视频帧逐像素对齐。论文给出的理由十分明确：原始相机参数只是一些数值，模型很难把它们和具体像素关联起来；Plücker 嵌入是像素级的空间编码，每个像素都携带其对应射线的方向和力矩，几何意义清楚，控制模块还只依赖这一个输入，对训练数据的外观不敏感。

### 6.3 智能驾驶中的应用

这种相机编码已经成为驾驶场景视频生成中常用的条件表示之一：

- MyGo（2024）面向多视角驾驶视频生成：把相机 Plücker 坐标用类 ControlNet 的结构注入预训练 U-Net，配合以对极几何（epipolar geometry，多视角图像之间固有的投影约束）为约束的跨视角注意力，保持多视角之间的一致；
- OmniNWM（2025）面向驾驶导航世界模型：把输入轨迹编码成归一化的全景 Plücker 射线图（ray-map），逐像素地控制全景视频生成；
- NVIDIA 的 Cosmos（2025，面向物理 AI 的世界模型平台）：把潜变量与 Plücker 嵌入直接拼接作为相机条件，论文中的写法和本文完全一致，即 $\boldsymbol{r} = (\boldsymbol{d},\ \boldsymbol{m}) \in \mathbb{R}^6$，$\boldsymbol{m} = \boldsymbol{c} \times \boldsymbol{d}$，$\boldsymbol{c}$ 是相机中心。

### 6.4 编码与参数化的对比

同一组 6 个数，在优化中和在网络中的处境完全不同：

| 对比维度 | 用于优化（第 5 节） | 用作网络输入（第 6 节） |
| --- | --- | --- |
| 6 个数对 4 个自由度 | 冗余构成负担，需用正交表示实现最小参数化 | 不构成问题，网络可自行学习利用冗余参数 |
| 约束 $\boldsymbol{d} \cdot \boldsymbol{m} = 0$ | 需显式处理，否则数值会出现问题 | 按构造自动满足 |
| 典型场景 | 线特征 BA、VIO 滑窗 | 相机条件、射线条件 |

两个易于验证的性质：单个像素的嵌入沿射线平移不变（$\boldsymbol{o} \to \boldsymbol{o} + t\boldsymbol{d}_{u,v}$ 时 $\boldsymbol{o} \times \boldsymbol{d}_{u,v}$ 不变），因此它编码的是“这条有向直线”而非“从哪里出发”；但整幅网格中两条不同的射线相交时，即可唯一确定相机中心，位姿信息并未丢失。方向反转时嵌入整体变号，因此编码本身即可区分朝向。

## 7. 常见困惑澄清

**Q1：$\pi = 0$ 就是相交吗？**
不一定。$\pi = 0$ 等价于共面，相交和平行都属于共面情形。要区分二者，需进一步检验 $\boldsymbol{d}_1 \times \boldsymbol{d}_2$ 是否为零。对求交算法而言，平行通常被当作退化情形统一处理。

**Q2：6 个数，自由度怎么是 4？**
一个整体缩放（齐次性）减少一个自由度，一个二次约束 $\boldsymbol{d} \cdot \boldsymbol{m} = 0$ 再减少一个自由度，$6 - 1 - 1 = 4$，正好等于三维直线自身的自由度。

**Q3：Plücker 坐标能区分射线和它的反向射线吗？能记录起点在哪吗？**
方向能够区分，起点则无法记录。齐次意义下 $(\boldsymbol{d};\ \boldsymbol{m})$ 和 $(-\boldsymbol{d};\ -\boldsymbol{m})$ 是同一个点，直线本身无方向；但射线规定了一个具体的代表元（保留原始的 $\boldsymbol{d}$），所有边积符号都依赖这个选择：把 $\boldsymbol{d}$ 反向，全部符号翻转，第 4 节的“正面/背面”随之互换。而起点沿射线滑动不改变 $\boldsymbol{o} \times \boldsymbol{d}$，所以射线的起点（对应 $t \geq 0$）与长度（$t$ 的上限）均不在 Plücker 坐标之内，必须另行检查。Mahovsky–Wyvill 补充的“另加起点位置检查”正是为了解决这个问题；Platis–Theoharis 也承认，$t$ 范围限制只能在后处理中施加，并把这一点列为相对 Haines 算法的劣势。

**Q4：不同文献的公式符号对不上怎么办？**
原因在于各家约定不同：$\boldsymbol{m} = \boldsymbol{p} \times \boldsymbol{d}$ 还是 $\boldsymbol{d} \times \boldsymbol{p}$、六元组的分量顺序（第 6 节 CameraCtrl 的力矩在前，Cosmos 的方向在前）、边积取正还是取负，都会使公式之间相差一个正负号。例如 Mahovsky–Wyvill 的 side 和 Platis–Theoharis 的 $\bowtie$ 实际计算的都是 $-\pi$（即 $\tau$），数学文献（如 Stolfi 的定向射影几何）又自成一套。所幸所有判交规则都只依赖“同号/异号”，对整体翻转不敏感。读文献时应关注判定规则而不是单个公式的正负，据此即可统一各家的约定。

**Q5：3D 车道线检测里用的 anchor 是 Plücker 坐标吗？**
不是。基于锚点的 PersFormer 和 Anchor3DLane 用各自设计的几何参数化（以 PersFormer 为例：固定纵坐标采样，回归横向偏移和高度，并附加锚点倾角），不用锚点的 LATR 则用查询与固定纵坐标构成的点集表示；三篇论文原文中都没有出现 Plücker 坐标。网上偶尔把“车道线是直线”和“Plücker 表示直线”混在一起，说成“车道线检测用 Plücker”，阅读时需要加以分辨。Plücker 坐标在智能驾驶中的落点是第 5、6 节所述的线特征参数化和相机射线编码。

## 8. 历史脉络：从 Plücker 到今天

- 起源：Julius Plücker（1801–1868），波恩大学教授，数学家和实验物理学家（气体放电与阴极射线的早期研究者）。他晚年在《Neue Geometrie des Raumes, gegründet auf die Betrachtung der geraden Linie als Raumelement》（1868–1869，莱比锡）中建立了以直线为空间元素的几何，线坐标由此而来；第二卷在他去世后由他年轻的学生 Felix Klein 完成编辑。直线全体构成 $\mathbb{P}^5$ 中的 Klein 二次曲面，相交判定来自这张曲面的配极，这套内容后来发展成线几何与线丛理论。
- 力学与机器人学：“力 + 力矩”这对六元组本身就是 Plücker 坐标：Ball 的螺旋理论（A Treatise on the Theory of Screws，1900）建立在它之上；现代机器人学中 Featherstone 的空间向量代数（Rigid Body Dynamics Algorithms，2008）直接声明使用 Plücker 坐标。对偶数与双四元数（Clifford、Study）是直线与螺旋的另一种等价表示。
- 图形学：Ray Tracing News 上有一条清楚的线索：Erickson（1997）介绍、Shoemake 的著名教程（1998）、Jones（2000）续篇；判交应用见 Amanatides 与 Choi（1997，三角形网格）、Platis 与 Theoharis（2003，四面体）、Mahovsky 与 Wyvill（2004，盒）。Blinn 的 Lines in Space 专栏系列（IEEE Computer Graphics and Applications，2003–2004，共 8 篇）从四维叉积出发，是讲述直线表示的另一套系统材料。射线–三角形测试方面，Woop 等人 2013 年的 watertight 算法（相邻三角形共享边处不漏判、不重复判交）虽然不直接使用 Plücker 坐标，但思想同源：把射线映射到一个更大的齐次空间，使符号与退化情形变得可控制。
- 计算机视觉与线重建：Bartoli 与 Sturm（2005）建立起线段运动恢复结构的整套表示、三角化与 BA；PL-SLAM（2019）、PL-VINS（2020）把它引入实时 SLAM/VIO；LIMAP（2023）做成大规模多视三维线建图工具箱；PlückerNet（2021）用学习的方法完成线配准。
- 射线编码与世界模型：Light Field Networks（2021）把 Plücker 射线坐标当作神经网络的逐像素输入（后来的相机条件工作普遍把它当作来源）；CameraCtrl（2025）、MyGo（2024）、OmniNWM（2025）、Cosmos（2025）等把它发展为视频生成与驾驶世界模型中常用的相机条件。
- 可视性：Teller 在 1990 年代初的博士论文把刺穿线用于门户可见性（与 Hanrahan 合作的 SIGGRAPH 93 论文处理光照计算中的可见性）；Nirenstein、Bittner 等人后来把 from-region 可见性计算整体移植到 Plücker 空间。

## 9. 小结

| 表示方法 | 数的个数 | 冗余与约束 | 两线相对位置判定 |
| --- | --- | --- | --- |
| 两点 | 6 | 可滑动冗余 | 需构造辅助向量 |
| 点 + 方向 | 6 | 可滑动冗余 | 需构造辅助向量 |
| Plücker | 6（齐次） | 约束 $\boldsymbol{d} \cdot \boldsymbol{m} = 0$ | 一次双线性边积 |

主要结论如下：

- Plücker 坐标由一个方向和一个力矩组成，共 6 个数，实际自由度 4；
- 两条直线的相对位置一次边积即可判定：取值为零表示共面，正负号表示绕向；
- 在图形学中，射线–三角形测试就是沿射线方向的二维点在三角形内测试，Möller–Trumbore 是它的共享子表达式版本；三维凸体不能“全体棱同号”，要按面分组或取轮廓；
- 用于优化时要配合最小参数化（正交表示）；用作网络输入时 6 个数可以直接使用，冗余无害；
- 线测试和射线编码都不含起点与距离信息，需要时另行检查。

## 参考资料

智能驾驶与视觉文献：

1. Fu, Q., Wang, J., Yu, H., et al., [*PL-VINS: Real-Time Monocular Visual-Inertial SLAM with Point and Line Features*](https://arxiv.org/abs/2009.07462), arXiv:2009.07462, 2020。
2. Gómez-Ojeda, R., Moreno, F.-A., Zuñiga-Noël, D., et al., *PL-SLAM: A Stereo SLAM System through the Combination of Points and Line Segments*, IEEE Transactions on Robotics 35(3): 734–746, 2019。
3. Qin, T., Li, P., Shen, S., [*VINS-Mono: A Robust and Versatile Monocular Visual-Inertial State Estimator*](https://arxiv.org/abs/1708.03852), IEEE Transactions on Robotics, 2018。
4. Bartoli, A., Sturm, P., *Structure-from-Motion Using Lines: Representation, Triangulation, and Bundle Adjustment*, Computer Vision and Image Understanding 100(3): 416–441, 2005。
5. Liu, S., Yu, Y., Pautrat, R., et al., [*3D Line Mapping Revisited*](https://arxiv.org/abs/2303.17504), CVPR 2023。
6. Liu, L., Li, H., Yao, H., Zha, R., [*PlückerNet: Learn to Register 3D Line Reconstructions*](https://openaccess.thecvf.com/content/CVPR2021/papers/Liu_PluckerNet_Learn_To_Register_3D_Line_Reconstructions_CVPR_2021_paper.pdf), CVPR 2021。
7. Hartley, R., Zisserman, A., *Multiple View Geometry in Computer Vision*, Cambridge University Press, 2003。
8. Sitzmann, V., Rezchikov, S., Freeman, W. T., et al., [*Light Field Networks: Neural Scene Representations with Single-Evaluation Rendering*](https://arxiv.org/abs/2106.02634), NeurIPS 2021。
9. He, H., Xu, Y., Guo, Y., et al., [*CameraCtrl: Enabling Camera Control for Video Diffusion Models*](https://arxiv.org/abs/2404.02101), ICLR 2025。
10. Yao, Y., Guo, X., Ding, C., Wu, W., [*MyGo: Consistent and Controllable Multi-View Driving Video Generation with Camera Control*](https://arxiv.org/abs/2409.06189), arXiv:2409.06189, 2024。
11. Li, B., Ma, Z., Du, D., et al., [*OmniNWM: Omniscient Driving Navigation World Models*](https://arxiv.org/abs/2510.18313), arXiv:2510.18313, 2025。
12. NVIDIA, Agarwal, N., et al., [*Cosmos World Foundation Model Platform for Physical AI*](https://arxiv.org/abs/2501.03575), arXiv:2501.03575, 2025。
13. Chen, L., Sima, C., Li, Y., et al., [*PersFormer: 3D Lane Detection via Perspective Transformer and the OpenLane Benchmark*](https://arxiv.org/abs/2203.11089), ECCV 2022。
14. Huang, S., Shen, Z., Huang, Z., et al., [*Anchor3DLane: Learning to Regress 3D Anchors for Monocular 3D Lane Detection*](https://arxiv.org/abs/2301.02371), CVPR 2023。
15. Luo, Y., Zheng, C., Yan, X., et al., [*LATR: 3D Lane Detection from Monocular Images with Transformer*](https://arxiv.org/abs/2308.04583), ICCV 2023。

图形学文献：

16. Shoemake, K., [*Plücker Coordinate Tutorial*](https://www.realtimerendering.com/resources/RTNews/html/rtnv11n1.html#art3), Ray Tracing News 11(1), 1998。
17. Mahovsky, J., Wyvill, B., [*Fast Ray-Axis Aligned Bounding Box Overlap Tests with Plücker Coordinates*](https://cspages.ucalgary.ca/~blob/ps/jgt04.pdf), journal of graphics tools 9(1): 35–46, 2004。
18. Platis, N., Theoharis, T., [*Fast Ray–Tetrahedron Intersection using Plücker Coordinates*](https://www.tandfonline.com/doi/abs/10.1080/10867651.2003.10487593), journal of graphics tools 8(4): 37–48, 2003。
19. Möller, T., Trumbore, B., *Fast, Minimum Storage Ray-Triangle Intersection*, journal of graphics tools 2(1): 21–28, 1997。
20. Amanatides, J., Choi, K., *Ray Tracing Triangular Meshes*, Proceedings of the Eighth Western Computer Graphics Symposium: 43–52, 1997。
21. Williams, A., Barrus, S., Morley, R. K., Shirley, P., *An Efficient and Robust Ray-Box Intersection Algorithm*, journal of graphics tools 10(1): 49–54, 2005。
22. Woop, S., Benthin, C., Wald, I., [*Watertight Ray/Triangle Intersection*](https://jcgt.org/published/0002/01/05/), Journal of Computer Graphics Techniques 2(1): 65–82, 2013。
23. Teller, S., Hanrahan, P., *Global Visibility Algorithms for Illumination Computations*, Proceedings of SIGGRAPH '93: 239–246, 1993。
24. Nirenstein, S., Blake, E. H., Gain, J. E., [*Exact From-Region Visibility Culling*](https://people.cs.uct.ac.za/~jgain/wp-content/papercite-data/pdf/nirenstein2002.pdf), Proceedings of the 13th Eurographics Workshop on Rendering: 191–202, 2002。
25. Bittner, J., [*Hierarchical Techniques for Visibility Computations*](https://dcgi.fel.cvut.cz/home/bittner/publications/diss_web.pdf), 博士学位论文，捷克技术大学，2002。

历史与延伸：

26. Plücker, J., *Neue Geometrie des Raumes, gegründet auf die Betrachtung der geraden Linie als Raumelement*, Leipzig, 1868–1869（第二卷由 Felix Klein 在作者身后编辑完成）。
27. Ball, R. S., *A Treatise on the Theory of Screws*, Cambridge University Press, 1900。
28. Stolfi, J., *Oriented Projective Geometry*, Academic Press, 1991。
29. Featherstone, R., *Rigid Body Dynamics Algorithms*, Springer, 2008。
30. Blinn, J. F., *Jim Blinn's Corner: Lines in Space* 系列专栏（共 8 篇）, IEEE Computer Graphics and Applications, 2003–2004。
