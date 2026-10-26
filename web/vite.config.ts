import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "100.109.114.47",
    port: 8009,
    strictPort: true,
    proxy: {
      "/api/csvs": "http://127.0.0.1:4000",
    },
  },
});
