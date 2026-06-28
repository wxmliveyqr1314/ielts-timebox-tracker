/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import {defineConfig, loadEnv} from 'vite';

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {}

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "favicon.svg",
          "favicon-16x16.png",
          "favicon-32x32.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "TimeBox Tracker",
          short_name: "TimeBox",
          description: "Local-first IELTS study planning, tracking, and progress review.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait-primary",
          background_color: "#F8FAFC",
          theme_color: "#4F46E5",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          navigateFallback: "/index.html",
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(pkg.version),
      '__BUILD_COMMIT__': JSON.stringify(commitHash),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (
              id.includes("lucide-react") ||
              id.includes("date-fns") ||
              id.includes("motion")
            ) return "ui-vendor";
            return "vendor";
          },
        },
      },
    },
    test: {
      exclude: ['node_modules', 'e2e', 'e2e/**'],
    },
  };
});
