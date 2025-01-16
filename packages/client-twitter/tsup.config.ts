import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    noExternal: [],
    external: [
        // Node.js built-ins
        "dotenv",
        "fs",
        "path",
        "stream",
        "util",
        "events",
        "os",
        "crypto",
        "buffer",
        "url",
        "zlib",
        "net",
        "tls",
        "assert",
        "child_process",
        "worker_threads",
        "perf_hooks",
        "querystring",
        "dns",
        "punycode",
        "tty",
        "constants",
        "string_decoder",
        // Node prefixed modules
        "node:*",
        // Dependencies that should be external
        "@elizaos/*",
        "@reflink/*",
        "@node-llama-cpp",
        "puppeteer*",
        "playwright*",
        "ws",
        "whatwg-url",
        "agentkeepalive",
        "http*",
        "https*",
    ],
    esbuildOptions(options) {
        options.platform = "node";
        options.target = "node18";
        options.mainFields = ["module", "main"];
        options.conditions = ["import", "module", "require", "default"];
        options.define = {
            "process.env.NODE_DEBUG": "false",
        };
        // Add pattern matching for external packages
        options.external = [
            "puppeteer*",
            "playwright*",
            "@elizaos/*",
            "node:*",
            "ws*",
        ];
    },
});
