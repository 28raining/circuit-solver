import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
// import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["pyodide"],
  },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [
        {
          browser: "chromium",
        },
      ],
    },
  },
  plugins: [
    react(),
    svgr(),
    // visualizer({
    //   open: true,
    //   filename: "dist/bundle-report.html",
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ],
});
