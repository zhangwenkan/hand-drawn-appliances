# colorfigures — 开发态源码（还原自线上站点）

> 来源：<https://april-zhu.com/colorfigures>（April Zhu 的作品页）
> 仓库：https://github.com/zhangwenkan/hand-drawn-appliances
> 还原日期：2026-10-18 · 作者：April Zhu（站点未公开源码仓库，本工程由线上产物反向拆分重建）

## 这是什么

线上页面是一个外壳：17 个手绘等距小机器（洗衣机、咖啡机、自动售货机……）各自是一份**完整的内嵌 HTML 文档**，通过 iframe `srcdoc` 注入。每份文档 = `共享 core` + `该 figure 专属代码` 两段拼接，未压缩、注释完整。

本工程把「打包后的形态」拆回「开发态形态」——即 core 注释里描述的架构：

> *A figure page loads this file, then calls mountFigure({...}).*（core/colorfigures.js 头部注释）

**验证**：`node build.js` 重新生成的 `dist/index.html` 与线上页面**逐字节一致**（`cmp` 通过）。也就是说这套源码不是"仿写"，而是原站构建产物的无损还原。

## 目录结构

```
colorfigures-src/
├── build.js                  零依赖构建脚本（Node ≥ 14）
├── index.template.html       外壳页面模板（含 const FIGS 占位符）
├── figures.json              figure 清单：顺序、id、名称、各自的 HTML 封装
├── core/
│   └── colorfigures.js       共享 core：投影/形状/着色/墨线/页面外壳 + mountFigure()
├── figures/                  现行一代 figure 源码（8 个，共享同一份 core）
│   ├── washer.js             ★ Fig.01 洗衣机（本次目标）
│   ├── espresso.js vending.js microwave.js fridge.js
│   └── gashapon.js photobooth.js arcade.js
├── legacy/                   旧代码库（Colorfigures 2.0）遗留 figure，原样保留（9 个）
│   └── toaster.html sharpener.html …（架构与现行 core 不同，未拆分）
├── dev/                      开发态页面：core 与 figure 以 <script src> 分离加载
│   └── washer.html 等 8 个 —— 直接用浏览器打开即可玩
└── dist/                     构建产物
    ├── index.html            外壳页（与线上逐字节一致）
    └── figures/*.html        各 figure 的内嵌文档（即线上注入 srcdoc 的内容）
```

## 怎么用

**开发模式**（改代码）：浏览器直接打开 `dev/washer.html`——core 和 figure 是两个独立文件，改 `figures/washer.js` 刷新即生效，这正是 core 头部注释描述的工作方式。

**构建发布**：

```bash
node build.js        # 生成 dist/index.html + dist/figures/*.html + dev/*.html
```

## 关于 washer（Fig.01 洗衣机）

`figures/washer.js`（约 40KB，未压缩）结构：

| 区段 | 内容 |
|---|---|
| geometry | 机身尺寸、观察窗/门圈/玻璃、抽屉、旋钮、显示屏等常量 |
| programs | 洗涤程序（压缩表示：T 秒真实时间） |
| clothes / laundry | 滚筒内衣物、篮筐与滚筒间的搬运动画 |
| porthole door | 门圈 + 玻璃，绕右侧竖轴开合 |
| control panel | 旋钮、按键、显示屏、 detergent 抽屉 |
| back / sides | 翻身后才可见的背面与侧面 |
| scene / behaviour | 场景组装与交互行为 |
| `mountFigure({...})` | 配置入口：状态机、按钮、readout 文案、URL 参数 |

`core/colorfigures.js`（约 27KB）是所有 figure 共享的引擎：等距投影、平面图形、着色、墨线轮廓、页面外壳（拖拽转向、光源、线宽、调色板 UI）。

## 两个世代

线上把这 17 个 figure 分成了两代，本工程如实保留：

- **现行一代（8 个，目录 `figures/`）**：washer、espresso、vending、microwave、fridge、gashapon、photobooth、arcade。共享同一份 core（已验证 8 份内嵌 core 完全一致），但 HTML 封装有漂移（有的带 `<title>`、有的换行排版不同）——各 figure 的精确封装记录在 `figures.json` 的 `head/mid/tail` 字段里，因此逐字节复刻不受影响。
- **旧一代（9 个，目录 `legacy/`）**：toaster、sharpener、windup、crossing、smokealarm、musicbox、cistern、foodtruck、booth。属于另一套代码库（页内自称 *Colorfigures 2.0*，iso gallery 架构、`FIG.push`、SVG 发光滤镜），与现行 core 不兼容，原样保留未拆分。

## 已知缺失

- **BRIEF.md**：core 注释引用它作为"绘图契约与约定"（*See BRIEF.md for the drawing contract*），但线上构建产物不含此文件，无法还原。约定本身散落在 core 与各 figure 的注释里。
- 构建工具链本身（原作者的 build 脚本）未随页面发布；`build.js` 是按产物特征重写的等价物，输出已验证逐字节一致。

## 备注

- 还原方法：从线上 HTML 中按 `<script>` 边界拆分 core / figure；序列化规则（`\uXXXX` 转义 + `<\/` 转义）经与原页面对比逆向确认。
- 此为个人学习研究用途；作品版权归 April Zhu 所有。
