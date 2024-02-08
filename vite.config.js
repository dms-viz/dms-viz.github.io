import { defineConfig } from "vite";
import { version } from "./package.json";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        v0: "v0/index.html",
      },
    },
  },
  define: {
    // Pass the app version from package.json to the app
    __APP_VERSION__: JSON.stringify(version),
  },
});
