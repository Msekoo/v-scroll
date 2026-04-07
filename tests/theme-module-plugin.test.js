import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import createThemeModulePlugin from "../tools/theme-module-plugin.js";

const TEMP_DIRS = [],
  writeTempFile = async (file_path, text) => {
    await mkdir(dirname(file_path), { recursive: true });
    await writeFile(file_path, text);
  },
  createTempRoot = async () => {
    const temp_root = await mkdtemp(join(tmpdir(), "v-scroll-test-"));

    TEMP_DIRS.push(temp_root);
    return temp_root;
  };

afterEach(async () => {
  await Promise.all(
    TEMP_DIRS.splice(0).map((temp_dir) => rm(temp_dir, { force: true, recursive: true }))
  );
});

describe("theme-module-plugin", () => {
  it("builds theme css into an importable js module", async () => {
    const root = await createTempRoot(),
      css_path = join(root, "src/theme/ocean/v-scroll.css"),
      output_path = join(root, "public/theme/ocean/v-scroll.js");

    await writeTempFile(
      css_path,
      `
        :root {
          --svgScroll: __SVG_SCROLL__;
          --svgGrab: __SVG_GRAB__;
        }

        v-scroll::part(bar) {
          inline-size: 9px;
        }
      `
    );
    await writeTempFile(
      join(root, "svg/scroll.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>`
    );
    await writeTempFile(
      join(root, "svg/grab.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`
    );

    const plugin = createThemeModulePlugin();

    await plugin.configResolved({ root });

    const module_text = await readFile(output_path, "utf8");

    expect(module_text.startsWith("export default ")).toBe(true);
    expect(module_text).toContain("data:image/svg+xml");
    expect(module_text).toContain("inline-size:9px");
  });

  it("rebuilds the generated theme module on hot updates", async () => {
    const root = await createTempRoot(),
      css_path = join(root, "src/theme/ocean/v-scroll.css"),
      output_path = join(root, "public/theme/ocean/v-scroll.js");

    await writeTempFile(
      css_path,
      `
        :root {
          --svgScroll: __SVG_SCROLL__;
          --svgGrab: __SVG_GRAB__;
        }

        v-scroll::part(bar) {
          inline-size: 9px;
        }
      `
    );
    await writeTempFile(
      join(root, "svg/scroll.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>`
    );
    await writeTempFile(
      join(root, "svg/grab.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`
    );

    const plugin = createThemeModulePlugin();

    await plugin.configResolved({ root });
    await writeTempFile(
      css_path,
      `
        :root {
          --svgScroll: __SVG_SCROLL__;
          --svgGrab: __SVG_GRAB__;
        }

        v-scroll::part(bar) {
          inline-size: 21px;
        }
      `
    );
    await plugin.handleHotUpdate({ file: css_path });

    const module_text = await readFile(output_path, "utf8");

    expect(module_text).toContain("inline-size:21px");
  });
});
