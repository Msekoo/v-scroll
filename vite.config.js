import { defineConfig } from "vite";

import themeModulePlugin from "./tools/theme-module-plugin.js";

const importMapExternalPlugin = () => {
  let is_build = false;

  return {
    name: "importmap-external",
    configResolved(config) {
      is_build = config.command === "build";
    },
    resolveId(source) {
      if (!source.startsWith("$/") || !is_build) {
        return null;
      }

      return { id: source, external: true };
    }
  };
};

export default defineConfig({
  plugins: [themeModulePlugin(), importMapExternalPlugin()],
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.js"
  },
  server: {
    host: true
  },
  build: {
    target: "esnext",
    rollupOptions: {
      external: (source) => source.startsWith("$/")
    }
  }
});
