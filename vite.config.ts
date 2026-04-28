import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";

function fontPreloadPlugin(): Plugin {
  return {
    name: "font-preload",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const fonts = Object.values(ctx.bundle ?? {}).filter(
          (a) => a.type === "asset" && typeof a.fileName === "string" && a.fileName.endsWith(".woff2"),
        );
        const latin = fonts.filter((a) =>
          typeof a.fileName === "string" && /-latin-wght-normal-/.test(a.fileName),
        );
        return latin.map((a) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            as: "font",
            type: "font/woff2",
            crossorigin: "",
            href: `./${a.fileName}`,
          },
          injectTo: "head" as const,
        }));
      },
    },
  };
}

// Vite is rooted at src/ so the dev server can serve src/index.html as "/".
// build.outDir = ".." (the repo root) so GitHub Pages serves the built artefacts directly.
// emptyOutDir is false so we never wipe data.json, .git, scripts/, tests/ or other tracked assets.
// data.json is fetched at runtime via a relative URL and is NEVER hashed — the daily cron
// regenerates it in place and any hashing would break references.
export default defineConfig({
  root: "src",
  base: "./",
  publicDir: false,
  plugins: [fontPreloadPlugin()],
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
        destination: resolve(__dirname, "src/destination.html"),
        plan: resolve(__dirname, "src/plan.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
