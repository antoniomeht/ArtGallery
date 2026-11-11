import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: { build: { license: { fileName: "licenses.md" } } },
  preload: { build: { license: { fileName: "licenses.md" } } },
  renderer: {
    plugins: [react()],
    // What the renderer bundles; scripts/third-party-notices.mjs ships it.
    build: { license: { fileName: "licenses.md" } },
  },
});
