import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    dts: false,
    external: [
        "dotenv",
        "fs",
        "path",
        "http",
        "https",
        "viem",
        "@lifi/sdk",
        "@elizaos/core",
    ],
});
