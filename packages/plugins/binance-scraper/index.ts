import { Plugin, Action } from "@elizaos/core";
import { BinanceScraper } from "./src/scraper";
import { FirebaseNotificationClient } from "./src/firebase";

const scrapeBinanceAction: Action = {
    name: "SCRAPE_BINANCE",
    description: "Scrapes latest Binance listings and posts to Twitter",
    handler: async (runtime) => {
        const scraper = new BinanceScraper();
        const firebase = new FirebaseNotificationClient();

        // Get latest listings
        const listings = await scraper.get_latest_listings();

        for (const listing of listings) {
            // Check if we've already processed this listing
            const existingNotifications =
                await firebase.check_for_last_notification_by_token(
                    listing.currency.address,
                    1 // Check last 24 hours
                );

            if (existingNotifications.length === 0) {
                // Generate tweet content using the agent's personality
                const tweetContent = await runtime.generateText({
                    systemPrompt:
                        "You are announcing a new Binance listing. Be excited but professional.",
                    userPrompt: `Create a tweet about this new listing: ${JSON.stringify(
                        listing
                    )}`,
                    maxTokens: 280, // Twitter limit
                });

                // Post to Twitter
                await runtime.triggerAction("POST_TWEET", {
                    content: `${tweetContent}\n\n${listing.exchange.trading_pair_url}`,
                });

                // Save to Firebase
                await firebase.save_notification(listing);
            }
        }

        return true;
    },
};

export const binanceScraper: Plugin = {
    name: "binance-scraper",
    description: "Scrapes Binance listings and posts to Twitter",
    actions: [scrapeBinanceAction],
};
