# 凸优化：连续阅读版

直接打开 Convex_Optimization_One_Day.html。无需安装、登录或联网；正文、KaTeX 字体和 Three.js 均内嵌，原始资料链接需要网络。

本版按顺序平铺直觉、定义与条件、符号、相关图解、完整推导、例题和自测。推导不再使用工作台、播放器或折叠模式；34 节课的 258 个证明步骤各显示一次。默认正文 18px，可切换为 21px；公式保留自然完整的等式，仅在真实的多步推导、方程组和分段定义中换行。

8 个模块按 420 分钟学习加 60 分钟休息组织。这是核心框架学习路线，不是一天精通凸优化的保证。需要基础线性代数和微积分，深读和独立练习需要额外时间。抽象 ADMM 一般收敛定理仍为带条件陈述，不声称完整重证教材所有定理。

全部在用图解统一由 Three.js 场景与相机生成。34 节课共有 195 个推导位置可展开图解，每节默认展开两张重点图，其余按需展开。它们仍是正文中的辅助材料，不代替证明；没有增加推导工作台。

支持拖动旋转、俯视、曲面剖切和参数变化。一维示例的展示厚度、变量轴、纵向显示缩放及有限实例的适用范围都有说明。曲面截切时，线、点与箭头保留作参照。页面按需载入，最多保持两个活动场景，离开视口后释放。

优先使用 WebGL；不可用时，使用 Three.js 官方 SVGRenderer 投影同一组三维几何，仍可旋转和剖切。这不是替换成旧的手绘二维图。云端已实际验证 SVG 渲染与操作；硬件 WebGL 路径未在该环境单独验收。

## 编辑与构建

- 内容：content/part1.json、part2.json、part3.json
- 页面：index.html、assets/app.js、assets/style.css
- 在用图解：assets/formula-models-foundations.js、formula-models-algorithms.js、formula-models-advanced.js、formula-figures.*、three-view.*
- 图解覆盖设计：content/formula-visual-map.json；195 个选中位置对应 34 类模型与不同状态，不是 195 条独立定理的图形证明。
- 已带可用的 Three.js bundle；直接运行 python tools/build.py 即可重编单文件。
- 编辑 three-view.js 后运行 npm install，再运行 npm run build。
- 运行 npm test 检查课程、数学、图解和连续阅读结构。

## 来源和许可

刘浩洋、户将、李勇锋、文再文《最优化：建模、算法与理论》及作者资料：https://faculty.bicmr.pku.edu.cn/~wenzw/optbook.html

Boyd、Vandenberghe《Convex Optimization》：https://web.stanford.edu/~boyd/cvxbook/

各课保留出处；本文为独立重编，不显示原教材页面。KaTeX 0.16.27 和 Three.js 0.186.1 使用 MIT 许可，许可文本随 assets/ 和单文件提供。

Three.js SVGRenderer 官方说明：https://threejs.org/docs/pages/SVGRenderer.html 。旧图解代码仅保留为历史计算测试支持，不再由页面载入。
