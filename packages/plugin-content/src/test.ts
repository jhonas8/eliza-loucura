import { BinanceScraperAction } from "./actions/binance_scraper";
import { IAgentRuntime } from "@elizaos/core";

async function test() {
    // Create a mock runtime
    const mockRuntime: IAgentRuntime = {
        async getSecret(key: string) {
            // Return Twitter credentials from environment variables
            return process.env[key];
        },
        async getState() {
            return {};
        },
        async setState() {},
        async getConfig() {
            return {};
        },
    };

    const scraper = new BinanceScraperAction(
        {
            maxPosts: 1,
            template:
                "🚀 {{title}} \n\nRead more: {{url}} \n\n#Akita #Binance #Crypto 🐕",
        },
        mockRuntime
    );

    console.log("Running scraper test...");
    await scraper.execute();
}

test().catch(console.error);
