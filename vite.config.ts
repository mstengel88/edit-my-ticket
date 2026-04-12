import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime"],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("recharts")) return "charts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router-dom")) return "router";
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("embla-carousel-react")
          ) {
            return "ui-vendor";
          }
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("@tanstack/react-query") ||
            id.includes("next-themes")
          ) {
            return "core-vendor";
          }

          return "vendor";
        },
      },
    },
  },
}));
