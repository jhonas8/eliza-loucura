import { Plugin, IAgentRuntime } from "@elizaos/core";
import { BinanceScraperAction } from "./actions/binance_scraper";

export class ContentPlugin implements Plugin {
    name = "content";
    description =
        "Plugin for scraping content from various sources and posting to social media";

    constructor(private runtime: IAgentRuntime) {}

    registerActions() {
        return {
            SCRAPE_BINANCE: (config: any) =>
                new BinanceScraperAction(config, this.runtime),
        };
    }
}
