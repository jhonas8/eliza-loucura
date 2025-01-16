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
        // Node.js built-ins that need to be bundled
        "http",
        "https",
        "net",
        "tls",
        "events",
        "stream",
        "util",
        "buffer",
    ],
    external: [
        // Node.js built-ins that can remain external
        "dotenv",
        "fs",
        "path",
        "os",
        "crypto",
        "url",
        "zlib",
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
        // Add Node.js built-in shims
        options.inject = [
            "node_modules/esbuild-node-builtins/http.js",
            "node_modules/esbuild-node-builtins/https.js",
            "node_modules/esbuild-node-builtins/stream.js",
            "node_modules/esbuild-node-builtins/events.js",
            "node_modules/esbuild-node-builtins/util.js",
            "node_modules/esbuild-node-builtins/buffer.js",
        ];
    },
});
