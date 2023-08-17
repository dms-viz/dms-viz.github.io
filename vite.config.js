// vite.config.js
import { defineConfig } from "vite";
import path from "path";
import fs from "fs-extra";

// Define the plugin
const customBuildPlugin = {
  name: "custom-build",
  async writeBundle() {
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const outputDir = path.resolve(currentDir, "dist");

    // Copying v1 directory
    await fs.copy(
      path.resolve(currentDir, "src/v1"),
      path.join(outputDir, "v1")
    );

    // Deleting src directory
    await fs.remove(path.resolve(outputDir, "src"));
  },
};

export default defineConfig({
  plugins: [customBuildPlugin],
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        v1: "src/v1/index.html",
        v2: "src/v2/index.html",
      },
    },
  },
});
