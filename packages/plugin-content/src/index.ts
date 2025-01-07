import { Plugin, IAgentRuntime } from "@elizaos/core";
import { BinanceScraperAction } from "./actions/binance_scraper";

export default class ContentPlugin implements Plugin {
    name = "content";
    description =
        "Plugin for scraping content from various sources and posting to social media";

    constructor(private runtime: IAgentRuntime) {}

    initialize() {
        // Any initialization logic here
        return Promise.resolve();
    }

    get actions() {
        return [
            new BinanceScraperAction(
                {
                    maxPosts: 1,
                    template:
                        "🚀 {{title}} \n\nRead more: {{url}} \n\n#Akita #Binance #Crypto 🐕",
                },
                this.runtime
            ),
        ];
    }

    get evaluators() {
        return [];
    }

    get providers() {
        return [];
    }

    get services() {
        return [];
    }
}
