import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/react",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/react/main.tsx",
      output: {
        entryFileNames: "interactive-sections.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
