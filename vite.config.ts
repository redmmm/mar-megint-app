import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

function copyToDocsPlugin(): Plugin {
  return {
    name: 'copy-to-docs',
    closeBundle() {
      const src = path.resolve(__dirname, 'dist');
      const dest = path.resolve(__dirname, 'docs');
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: './',
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [react(), copyToDocsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
