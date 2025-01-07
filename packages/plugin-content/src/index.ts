import { Plugin, IAgentRuntime } from "@elizaos/core";
import { BinanceScraperAction } from "./actions/binance_scraper";

interface ScheduledAction {
    action: string;
    interval: number;
    config: any;
}

interface Settings {
    scheduledActions?: ScheduledAction[];
    [key: string]: any;
}

export default class ContentPlugin implements Plugin {
    name = "content";
    description =
        "Plugin for scraping content from various sources and posting to social media";

    constructor(private runtime: IAgentRuntime) {
        console.log("ContentPlugin constructor called");
    }

    initialize() {
        console.log("ContentPlugin initialize called");
        return Promise.resolve();
    }

    get actions() {
        console.log("ContentPlugin actions getter called");
        const settings = this.runtime.character.settings as Settings;
        const scheduledActions = settings?.scheduledActions || [];
        const binanceAction = scheduledActions.find(
            (action) => action.action === "SCRAPE_BINANCE"
        );

        if (binanceAction) {
            console.log("Found SCRAPE_BINANCE action config:", binanceAction);
            return [
                new BinanceScraperAction(binanceAction.config, this.runtime),
            ];
        } else {
            console.log(
                "No SCRAPE_BINANCE action config found in scheduledActions"
            );
            return [];
        }
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

