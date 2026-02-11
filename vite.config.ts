import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/", // Œ¡ﬂ«¿“≈À‹ÕŒ ‰Îˇ smartoffer.pro

  server: {
    host: "localhost",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "./src/features/search/components/ui"),
    },
  },
});
