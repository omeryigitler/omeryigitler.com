import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/react",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        interactive: "src/react/main.tsx",
        projects: "src/react/projects-main.tsx",
        featured: "src/react/featured-main.tsx"
      },
      output: {
        entryFileNames: (chunkInfo) => chunkInfo.name === "interactive"
          ? "interactive-sections.js"
          : `${chunkInfo.name}.js`,
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
