import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "path",
        "https",
        "http",
        "agentkeepalive",
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
        "querystring",
        "dns",
        "punycode",
        "tty",
        "constants",
        "string_decoder",
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
