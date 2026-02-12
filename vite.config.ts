import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Для кастомного домена (smartoffer.pro) нужно "/"
  // Для GitHub Pages по пути /smartoffer-frontend/ — нужно "/smartoffer-frontend/"
  // Мы делаем авто-режим: если есть VITE_PAGES_BASE, используем его, иначе "/"
  base: process.env.VITE_PAGES_BASE || "/",

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
