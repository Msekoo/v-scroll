# v-scroll

一个零依赖的原生 `v-scroll` 组件示例，包含：

- 原生 `customElements` + Shadow DOM 结构隔离
- 真实 `overflow: auto` 滚动容器
- `ResizeObserver` 尺寸探测
- Pointer Events + `setPointerCapture` 拖拽映射
- 通过 `importmap` 指向不同主题路径
- 通过 Vite 插件把主题 CSS 编译成 `export default "..."` 的 JS 模块

## 启动

```bash
npm install
npm run dev
```

## 切换主题

默认主题：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/theme/default/"
  }
}
</script>
```

切到另一套主题：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/theme/graphite/"
  }
}
</script>
```
