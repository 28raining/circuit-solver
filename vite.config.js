import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
// import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [
        {
          browser: "chromium", // or 'firefox', 'webkit'
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
