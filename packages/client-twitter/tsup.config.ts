import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    target: "node18",
    noExternal: ["agent-twitter-client"],
    external: [
        "util",
        "stream",
        "http",
        "https",
        "url",
        "zlib",
        "combined-stream",
        "form-data",
        "whatwg-url",
        "@elizaos/core",
        "playwright",
        "playwright-core",
        "puppeteer",
        "puppeteer-core",
        "cheerio",
    ],
});
