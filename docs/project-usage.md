# v-scroll 项目使用说明

这份文档描述当前项目的目录结构、运行方式、主题切换方式，以及它现在已经实现到什么程度。

## 项目定位

这是一个原生 Web Components 的 `v-scroll` 示例项目，目标是实现：

- 真实内容滚动
- 自定义滚动条轨道和滑块外观
- hover / drag 态切换
- 鼠标脱离滑块后拖拽仍然生效
- 基于 `importmap` 的主题切换
- 基于 Vite 插件的主题 CSS 模块化构建

项目当前包含一个 demo 页面，不是独立发布到 npm 的库包结构。

## 目录结构

主要目录如下：

- `src/v-scroll.js`
  `v-scroll` 组件主体实现。
- `src/theme/default/v-scroll.css`
  默认主题源文件。
- `src/theme/graphite/v-scroll.css`
  另一套主题源文件。
- `tools/theme-module-plugin.js`
  负责把主题 CSS 编译成 JS 模块的 Vite 插件。
- `public/theme/default/v-scroll.js`
  默认主题编译产物。
- `public/theme/graphite/v-scroll.js`
  graphite 主题编译产物。
- `src/main.js`
  demo 页面入口。
- `src/demo.css`
  demo 页面本身的布局样式。
- `index.html`
  demo 页面的 `importmap` 入口和主题切换入口。

## 安装与启动

当前项目以 npm 为主：

```bash
npm install
npm run dev
```

生产构建：

```bash
./build.sh
```

`build.sh` 当前会执行：

```bash
npm run build
```

## 主题切换方式

这个项目的主题切换核心依赖 `importmap`。

`index.html` 会根据 URL 查询参数自动生成：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/theme/default/"
  }
}
</script>
```

如果你访问：

- `http://localhost:5173/`
  默认使用 `default` 主题
- `http://localhost:5173/?theme=graphite`
  使用 `graphite` 主题

这意味着第三方接入时，只需要让 `$/` 指向自己的主题目录即可。

## 组件使用方式

在当前项目里，demo 入口已经直接加载了组件：

```js
import "./v-scroll.js";
```

页面中正常使用：

```html
<v-scroll>
  <p>content</p>
  <p>content</p>
</v-scroll>
```

组件会把插槽内容代理到内部真实滚动容器中，并在有溢出时显示自定义轨道和滑块。

## 主题开发方式

新增一套主题时，按下面的目录约定添加文件：

```text
src/theme/<theme-name>/v-scroll.css
```

然后在主题 CSS 中通过 `::part(...)` 控制轨道和滑块样式，例如：

```css
v-scroll::part(track) { ... }
v-scroll::part(bar) { ... }
v-scroll[scrollable]::part(turned) { ... }
v-scroll[dragging]::part(drag) { ... }
```

启动开发服务或执行构建时，Vite 插件会自动生成：

```text
public/theme/<theme-name>/v-scroll.js
```

## 当前实现状态

当前项目已经实现：

- `customElements` 注册 `v-scroll`
- Shadow DOM 封装内部结构
- 原生 `overflow: auto` 真实滚动
- 隐藏系统默认滚动条
- 根据内容高度动态计算滑块高度
- 内容无溢出时隐藏自定义滚动条
- `pointerdown` + `pointermove` + `pointerup`
- `setPointerCapture` 保证拖拽离开滑块后仍然有效
- 拖拽时禁止文本误选
- hover / active / dragging 状态外露给主题 CSS
- Vite 构建主题 CSS 模块
- 通过 `importmap` 切换主题目录

## 当前已知边界

当前仓库更偏“可演示、可评审”的项目结构，而不是“可直接发布复用”的库结构：

- 入口仍以 demo 页面为中心
- 没有单独的库构建产物说明
- 没有对外发布包名和版本策略

如果后续要变成通用组件库，通常还需要继续补：

- 独立库入口
- 发布构建配置
- 更完整的主题扩展文档
- 更明确的浏览器兼容说明

## 推荐阅读顺序

如果你要继续维护这个项目，建议按下面顺序读代码：

1. [docs/v-scroll-detail-doc.md](/Users/mokz/work-bentch/v-scroll/docs/v-scroll-detail-doc.md)
2. [docs/requirement-supplement.md](/Users/mokz/work-bentch/v-scroll/docs/requirement-supplement.md)
3. [src/v-scroll.js](/Users/mokz/work-bentch/v-scroll/src/v-scroll.js)
4. [tools/theme-module-plugin.js](/Users/mokz/work-bentch/v-scroll/tools/theme-module-plugin.js)
5. `src/theme/*/v-scroll.css`
