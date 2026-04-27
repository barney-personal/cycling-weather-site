import { defineConfig } from "vite";
import { resolve } from "node:path";

// Vite is rooted at src/ so the dev server can serve src/index.html as "/".
// build.outDir = ".." (the repo root) so GitHub Pages serves the built artefacts directly.
// emptyOutDir is false so we never wipe data.json, .git, scripts/, tests/ or other tracked assets.
// data.json is fetched at runtime via a relative URL and is NEVER hashed — the daily cron
// regenerates it in place and any hashing would break references.
export default defineConfig({
  root: "src",
  base: "./",
  publicDir: false,
  build: {
    outDir: "..",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/index.html"),
        history: resolve(__dirname, "src/history.html"),
        methodology: resolve(__dirname, "src/methodology.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
