import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
// import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  test: {
    browser: {
      instances: [
        {
          enabled: true,
          browser: "chromium", // or 'firefox', 'webkit'
          provider: "playwright",
        },
      ],
    },
  },
  plugins: [
    react(),
    svgr(),
    // visualizer({
    //   open: true, // Automatically open the report in browser
    //   filename: "dist/bundle-report.html", // Report file location
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ],
});
