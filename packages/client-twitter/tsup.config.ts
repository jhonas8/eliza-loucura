import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    noExternal: [
        // Include ws and its dependencies to prevent dynamic require
        "ws",
        "bufferutil",
        "utf-8-validate",
        "stream/web",
        // OpenAI and its dependencies
        "openai",
        "agentkeepalive",
        "form-data-encoder",
        "formdata-node",
        "abort-controller",
    ],
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
        "http",
        "https",
        // Node prefixed modules
        "node:*",
        // Dependencies that should be external
        "@elizaos/*",
        "@reflink/*",
        "@node-llama-cpp",
        "puppeteer*",
        "playwright*",
    ],
    esbuildOptions(options) {
        options.platform = "node";
        options.target = "node18";
        options.mainFields = ["module", "main"];
        options.conditions = ["import", "module", "require", "default"];
        options.define = {
            "process.env.NODE_DEBUG": "false",
            "global.Buffer": "Buffer",
            "global.process": "process",
        };
        // Add pattern matching for external packages
        options.external = [
            "puppeteer*",
            "playwright*",
            "@elizaos/*",
            "node:*",
        ];
        // Add resolveExtensions to handle .js files
        options.resolveExtensions = [".ts", ".js", ".mjs", ".cjs"];
        // Ensure proper bundling of ESM dependencies
        options.format = "esm";
        options.bundle = true;
    },
});
