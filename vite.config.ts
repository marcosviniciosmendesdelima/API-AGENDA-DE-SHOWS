import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "client",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["../public/pwa-icon.svg"],
      manifest: {
        name: "Agenda de Shows da Banda",
        short_name: "ShowBand",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#111827",
        description: "Agenda de shows e gestão de eventos da banda.",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
  publicDir: "../public",
});
