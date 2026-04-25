import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";

// Plugin to copy extension files (manifest, content scripts, icons) to dist
function copyExtensionFiles() {
  return {
    name: "copy-extension-files",
    closeBundle() {
      const dist = resolve(__dirname, "dist");

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, "public/manifest.json"),
        resolve(dist, "manifest.json"),
      );

      // Copy background.js
      copyFileSync(
        resolve(__dirname, "public/background.js"),
        resolve(dist, "background.js"),
      );

      // Copy content scripts
      const csDir = resolve(dist, "content-scripts");
      if (!existsSync(csDir)) mkdirSync(csDir, { recursive: true });

      const csSrc = resolve(__dirname, "public/content-scripts");
      if (existsSync(csSrc)) {
        readdirSync(csSrc).forEach((file) => {
          copyFileSync(resolve(csSrc, file), resolve(csDir, file));
        });
      }

      // Copy icons folder if it exists
      const iconsSrc = resolve(__dirname, "public/icons");
      if (existsSync(iconsSrc)) {
        const iconsDir = resolve(dist, "icons");
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
        readdirSync(iconsSrc).forEach((file) => {
          copyFileSync(resolve(iconsSrc, file), resolve(iconsDir, file));
        });
      }

      console.log("✅ Extension files copied to dist/");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  base: "./",
});
