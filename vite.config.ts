import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  optimizeDeps: {
    force: true,
    exclude: ["@chainlink/cre-sdk"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Patch @radix-ui/react-compose-refs to fix React 19 infinite loop
      // See: https://github.com/radix-ui/primitives/issues/3799
      "@radix-ui/react-compose-refs": path.resolve(__dirname, "./src/lib/radix-compose-refs-patch.ts"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
