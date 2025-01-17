import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    noExternal: [
        // Core dependencies that need bundling
        "openai",
        "ws",
        "bufferutil",
        "utf-8-validate",
        "stream/web",
        "agentkeepalive",
        "form-data-encoder",
        "formdata-node",
        "abort-controller",
    ],
    external: [
        // Core Node.js modules
        "node:*",
        "http",
        "https",
        "net",
        "tls",
        "events",
        "stream",
        "util",
        "buffer",
        // Project dependencies
        "@elizaos/*",
        "puppeteer*",
        "playwright*",
    ],
    esbuildOptions(options) {
        options.platform = "node";
        options.target = "node18";
        options.format = "esm";
        options.bundle = true;
    },
});
