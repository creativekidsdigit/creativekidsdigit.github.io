import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Deployed under https://creativekidsdigit.github.io/app/
// Override with VITE_BASE_PATH for local previews or alternate hosts.
const base = process.env.VITE_BASE_PATH ?? "/app/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
