import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Для кастомного домена (https://smartoffer.pro) нужно "/"
  // Для GitHub Pages с путём /smartoffer-frontend/ было бы "/smartoffer-frontend/"
  base: "/",

  plugins: [react()],

  server: {
    host: "localhost",
    port: 8080,
    hmr: { overlay: false },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "./src/features/search/components/ui"),
    },
  },
});
