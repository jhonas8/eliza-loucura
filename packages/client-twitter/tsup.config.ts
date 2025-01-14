import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    noExternal: ["playwright-core", "puppeteer"],
    external: [
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "stream",
        "whatwg-url",
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
        "playwright-core",
        "playwright",
        "playwright-firefox",
        "playwright-chromium",
        "playwright-webkit",
        "puppeteer",
        "puppeteer-core",
        "ws",
        "readline",
        "process",
        "timers",
        "fs/promises",
    ],
    esbuildOptions(options) {
        options.platform = "node";
        options.target = "node18";
        options.mainFields = ["module", "main"];
        options.conditions = ["module", "import", "require"];
        options.banner = {
            js: `
                import { createRequire } from 'module';
                const require = createRequire(import.meta.url);
            `,
        };
    },
});
