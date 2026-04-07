# v-scroll 题面补充说明

这份文档用于说明项目里那些和 [v-scroll-detail-doc.md](/Users/mokz/work-bentch/v-scroll/docs/v-scroll-detail-doc.md) 字面表述不完全一致，但实际仍然满足需求的实现点。

## 1. 主题模块导入不是静态字符串 import

题面里的描述更接近：

```js
import cssText from "$/v-scroll.js";
```

当前实现不是静态导入，而是运行时动态导入：

```js
const THEME_IMPORT_PATH = "$/v-scroll.js";
const { default: css_text } = await import(/* @vite-ignore */ THEME_IMPORT_PATH);
```

原因：

- Vite 在 dev 模式下会对字符串字面量做静态分析。
- 如果直接写 `import("$/v-scroll.js")`，`vite:import-analysis` 会在开发期尝试解析 `$/v-scroll.js`，然后报错。
- 把路径提到变量后，Vite 无法继续静态解析这个字符串，浏览器会在运行时按 `importmap` 规则解析它。

这不会破坏题面要求，反而是让“基于 importmap 加载主题模块”这件事在 dev 和 build 两种模式下都真正可用。

## 2. 主题模块仍然是由 Vite Hook 生成的

题面的核心诉求不是“必须手写某种 import 语法”，而是：

- 主题样式源文件独立存在
- 构建时转成 JS 模块
- 第三方只改 `importmap` 就能切换主题

当前实现完全满足这三点：

- 源文件在 `src/theme/<theme>/v-scroll.css`
- 由 [tools/theme-module-plugin.js](/Users/mokz/work-bentch/v-scroll/tools/theme-module-plugin.js) 在 `configResolved` 阶段读取并构建
- 主题源文件或 SVG 光标变化时，会在 `handleHotUpdate` 阶段重新生成模块
- 构建结果输出到 `public/theme/<theme>/v-scroll.js`
- 页面通过 `$/` 的 `importmap` 映射切换主题目录

## 3. 主题模块输出路径被固定为 `public/theme/<theme>/v-scroll.js`

题面里写的是“自动写入到 /路径/v-scroll.js”，没有限定项目结构。

当前项目把路径约定为：

- 源主题目录：`src/theme/<theme>/v-scroll.css`
- 输出主题目录：`public/theme/<theme>/v-scroll.js`

这里需要额外说明一点：

- `src/theme/*` 才是主题源码
- `public/theme/*` 是由 Vite 插件生成出来、供运行时加载的产物

这样做的原因是：

- `public/` 下的文件会被 Vite 直接原样暴露
- 配合 `importmap` 时路径稳定、清晰
- 多主题目录天然分层，便于切换和扩展

这属于工程化落地时的目录约定，不影响题面要求本身。

## 4. 组件状态是通过 attribute + part 暴露给外部样式的

题面要求外部 CSS 可以控制：

- 滑块默认态
- hover 态
- drag 态

当前实现不是把这些样式写死在 Shadow DOM 里，而是通过以下方式把状态暴露给外部主题：

- `part="bar turned drag"` 这类 part 组合
- `scrollable`、`hovering`、`active`、`dragging` 这些 host attribute

也就是说，外部主题 CSS 可以直接写：

```css
v-scroll[scrollable]::part(turned) { ... }
v-scroll[dragging]::part(bar) { ... }
```

这比单纯依赖 CSS 变量更直接，仍然满足“外部 CSS 可定义状态变化”的要求。

## 5. 轨道和滑块结构仍然在 Shadow DOM 内，但视觉样式放在外部主题 CSS

题面要求“滚动轨道、滑块的样式不能写在 JavaScript 的 Shadow DOM 中”。

当前实现的划分是：

- Shadow DOM 内只保留必要的结构、布局骨架和基础隐藏规则
- 轨道与滑块的视觉样式放在 `src/theme/*/v-scroll.css`
- 外部通过 `::part(track)`、`::part(bar)`、`::part(turned)`、`::part(drag)` 控制外观

这满足题面要求的重点：视觉风格可被主题替换，而不是硬编码在组件内部。

## 6. SVG 光标不是直接引用文件，而是构建时内联进主题模块

题面只强调了 `scroll.svg` / `grab.svg` 的交互效果，没有限定它们必须以单独文件请求的形式存在。

当前项目在构建主题模块时会：

- 读取 `svg/scroll.svg` 和 `svg/grab.svg`
- 转成 data URL
- 替换到主题 CSS 里的 `__SVG_SCROLL__` 和 `__SVG_GRAB__`

这样做的好处是：

- 主题模块是完整自包含的
- 第三方切换主题时不需要额外处理光标资源路径
- `importmap` 指向的主题目录只要有一个 `v-scroll.js` 即可工作

因此，新增主题时如果还需要沿用这套光标能力，主题 CSS 里应继续保留这两个占位符，而不是手写固定 URL。

## 7. 当前项目的包管理仍以 npm 为准

题面附录里的 `AGENTS.md` 推荐使用 `bun i`，但这条更接近协作建议，不属于组件功能本身。

当前仓库的实际状态是：

- 安装：`npm install`
- 启动：`npm run dev`
- 构建：`./build.sh`
- `build.sh` 内部执行 `npm run build`

这不会影响组件是否满足题面第 1 到第 4 条的功能要求，但确实和附录建议存在差异。

## 结论

当前实现和题面真正相关的核心能力是一致的：

- 原生滚动容器 + 自定义滚动条外观
- `ResizeObserver` 驱动显隐与尺寸同步
- `Pointer Events` + `setPointerCapture` 拖拽
- 主题 CSS 经 Vite Hook 编译为 JS 模块
- 页面只改 `importmap` 就能切换主题

与题面字面不完全相同的地方，主要是为了让方案在 Vite 开发环境中可运行、在工程结构上更稳定。
