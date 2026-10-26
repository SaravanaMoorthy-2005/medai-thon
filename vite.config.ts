import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    strictPort: true,
    watch: {
      ignored: ["**/test-results/**", "**/playwright-report/**", "**/data/**"],
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.PORT || 3001}`,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          charts: [
            "echarts/core",
            "echarts/charts",
            "echarts/components",
            "echarts/renderers",
          ],
          vision: ["@mediapipe/tasks-vision"],
        },
      },
    },
  },
});
