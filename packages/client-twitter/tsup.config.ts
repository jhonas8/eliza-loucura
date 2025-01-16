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
        // All Node.js built-ins should be external
        "http",
        "https",
        "net",
        "tls",
        "events",
        "stream",
        "util",
        "buffer",
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
            // Add defines for Node.js built-ins
            "require('http')": "await import('http')",
            "require('https')": "await import('https')",
            "require('net')": "await import('net')",
            "require('tls')": "await import('tls')",
            "require('events')": "await import('events')",
            "require('stream')": "await import('stream')",
            "require('util')": "await import('util')",
            "require('buffer')": "await import('buffer')",
        };
        // Add pattern matching for external packages
        options.external = [
            "puppeteer*",
            "playwright*",
            "@elizaos/*",
            "node:*",
            // Add all Node.js built-ins
            "http",
            "https",
            "net",
            "tls",
            "events",
            "stream",
            "util",
            "buffer",
        ];
        // Add resolveExtensions to handle .js files
        options.resolveExtensions = [".ts", ".js", ".mjs", ".cjs"];
        // Ensure proper bundling of ESM dependencies
        options.format = "esm";
        options.bundle = true;
    },
});
