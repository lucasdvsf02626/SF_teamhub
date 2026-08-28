import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

// Unique id per build: git hash when available, always suffixed with the build
// time so even a rebuild of the same commit produces a fresh id.
function computeBuildId(): string {
  let hash = "nogit";
  try {
    hash = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    // building outside a git checkout (e.g. Lovable CI) — timestamp alone still works
  }
  return `${hash}-${Date.now()}`;
}

const BUILD_ID = computeBuildId();

// Emits /version.json alongside the bundle so deployed clients can detect
// that a newer build exists (see src/lib/version-watch.ts).
function versionFilePlugin(): Plugin {
  return {
    name: "emit-version-json",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId: BUILD_ID }),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  plugins: [react(), versionFilePlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Shared business logic. Lives outside src/ so the React Native app can
      // import the identical implementation rather than a copy.
      "@sf/core": path.resolve(__dirname, "./packages/core/src"),
    },
  },
}));
