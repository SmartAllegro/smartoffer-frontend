import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Для кастомного домена (smartoffer.pro) нужно "/"
  // Для GitHub Pages вида smartallegro.github.io/smartoffer-frontend/ нужно "/smartoffer-frontend/"
  // Чтобы работало в обоих вариантах без ручных правок — используем "./"
  base: "./",

  server: {
    host: "localhost",
    port: 8080,
    hmr: { overlay: false },
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "./src/features/search/components/ui"),
    },
  },
});
