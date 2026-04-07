import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { transform } from "lightningcss";

const ENTRY_FILE = "v-scroll.css",
  MODULE_FILE = "v-scroll.js",
  SRC_ROOT = "src/theme",
  SVG_ROOT = "svg",
  OUT_ROOT = "public/theme";

const normalizePath = (file_path) => file_path.split("\\").join("/");

const readThemeNames = async (theme_root) => {
  let entries = [];

  try {
    entries = await readdir(theme_root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const encodeSvgCursor = (svg_text, cursor) => {
  const compact_svg = svg_text.replace(/\s+/g, " ").trim(),
    encoded_svg = encodeURIComponent(compact_svg);

  return `url("data:image/svg+xml,${encoded_svg}") ${cursor}`;
};

const injectSvgCursor = async (root, css_text) => {
  const [scroll_svg, grab_svg] = await Promise.all([
      readFile(resolve(root, SVG_ROOT, "scroll.svg"), "utf8"),
      readFile(resolve(root, SVG_ROOT, "grab.svg"), "utf8")
    ]),
    replaced_css = css_text
      .replaceAll("__SVG_SCROLL__", encodeSvgCursor(scroll_svg, "10 10, ns-resize"))
      .replaceAll("__SVG_GRAB__", encodeSvgCursor(grab_svg, "7 7, grabbing"));

  return replaced_css;
};

const minifyCss = async (root, file_path) => {
  const source = await readFile(file_path, "utf8"),
    prepared_css = await injectSvgCursor(root, source),
    { code } = transform({
      filename: file_path,
      code: Buffer.from(prepared_css),
      minify: true
    });

  return Buffer.from(code).toString("utf8");
};

const writeThemeModule = async (root, theme_name) => {
  const css_path = resolve(root, SRC_ROOT, theme_name, ENTRY_FILE),
    module_path = resolve(root, OUT_ROOT, theme_name, MODULE_FILE),
    css_text = await minifyCss(root, css_path),
    module_text = `export default ${JSON.stringify(css_text)};\n`;

  await mkdir(dirname(module_path), { recursive: true });
  await writeFile(module_path, module_text);
};

const buildThemes = async (root) => {
  const theme_root = resolve(root, SRC_ROOT),
    theme_names = await readThemeNames(theme_root);

  await Promise.all(theme_names.map((theme_name) => writeThemeModule(root, theme_name)));
};

const isThemeEntry = (file_path) => {
  const normalized_path = normalizePath(file_path);

  return normalized_path.includes(`/${SRC_ROOT}/`) && normalized_path.endsWith(`/${ENTRY_FILE}`);
};

const isSvgEntry = (file_path) => {
  const normalized_path = normalizePath(file_path);

  return normalized_path.includes(`/${SVG_ROOT}/`) && normalized_path.endsWith(".svg");
};

export default () => {
  let root = process.cwd();

  return {
    name: "v-scroll-theme-module",
    async configResolved(config) {
      root = config.root;
      await buildThemes(root);
    },
    async handleHotUpdate(ctx) {
      if (!isThemeEntry(ctx.file) && !isSvgEntry(ctx.file)) {
        return;
      }

      await buildThemes(root);
    }
  };
};
