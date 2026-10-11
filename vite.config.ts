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
        if (fs.existsSync(dest)) {
          fs.rmSync(dest, { recursive: true, force: true });
        }
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
    proxy: {
      '/api/youtube-feed': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/youtube-feed/, '/feeds/videos.xml'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('gsap')) return 'vendor-gsap';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        },
      },
    },
  },
  plugins: [react(), copyToDocsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
