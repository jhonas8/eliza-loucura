import { Action, IAgentRuntime } from "@elizaos/core";
import axios from "axios";
import * as cheerio from "cheerio";
import TwitterClient from "@elizaos/client-twitter";
import dotenv from "dotenv";

dotenv.config();

interface BinanceScraperConfig {
    maxPosts: number;
    template: string;
}

export class BinanceScraperAction implements Action {
    name = "SCRAPE_BINANCE";
    description = "Scrapes Binance announcements and posts them to Twitter";
    similes = ["scrape", "fetch", "monitor"];
    examples = [
        [
            {
                user: "user",
                content: { text: "Scrape Binance announcements" },
            },
        ],
        [
            {
                user: "user",
                content: { text: "Post new Binance listings to Twitter" },
            },
        ],
    ];

    private twitterClient: any;
    private lastProcessedArticle: string | null = null;

    constructor(
        private config: BinanceScraperConfig,
        private runtime: IAgentRuntime
    ) {
        console.log(
            "BinanceScraperAction constructor called with config:",
            config
        );
        this.initTwitterClient();
    }

    private async initTwitterClient() {
        console.log("Initializing Twitter client...");
        this.twitterClient = await TwitterClient.start(this.runtime);
        console.log("Twitter client initialized");
    }

    handler = this.execute.bind(this);

    async validate(): Promise<boolean> {
        console.log("Validating BinanceScraperAction config...");
        if (!this.config.maxPosts || !this.config.template) {
            console.error("Invalid config: missing required fields");
            return false;
        }
        if (
            !process.env.TWITTER_API_KEY ||
            !process.env.TWITTER_API_SECRET ||
            !process.env.TWITTER_ACCESS_TOKEN ||
            !process.env.TWITTER_ACCESS_TOKEN_SECRET
        ) {
            console.error(
                "Missing Twitter API credentials in environment variables"
            );
            return false;
        }
        return true;
    }

    async execute(): Promise<void> {
        console.log("Executing BinanceScraperAction...");
        try {
            const articles = await this.getRecentAnnouncements();
            console.log(`Found ${articles.length} articles`);

            if (articles.length > 0) {
                const latestArticle = articles[0];
                console.log("Latest article:", latestArticle);

                if (latestArticle.url !== this.lastProcessedArticle) {
                    console.log("New article found, creating tweet...");
                    await this.createAndPostTweet(latestArticle);
                    this.lastProcessedArticle = latestArticle.url;
                } else {
                    console.log("No new articles to process");
                }
            }
        } catch (error) {
            console.error("Error executing BinanceScraperAction:", error);
            throw error;
        }
    }

    private async getRecentAnnouncements(): Promise<
        Array<{ title: string; url: string }>
    > {
        console.log("Fetching recent announcements from Binance...");
        const response = await axios.get(
            "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing"
        );
        const $ = cheerio.load(response.data);
        const articles: Array<{ title: string; url: string }> = [];

        console.log("Parsing announcement page...");
        $(".css-1wr4jig").each((_, element) => {
            const $el = $(element);
            const titleElement = $el.find(".css-1must4f");
            const linkElement = $el.find("a");

            const title = titleElement.text().trim();
            const url = linkElement.attr("href");

            if (title && url) {
                console.log("Found article:", { title, url });
                articles.push({ title, url: `https://www.binance.com${url}` });
            }
        });

        return articles.slice(0, this.config.maxPosts);
    }

    private async createAndPostTweet(article: {
        title: string;
        url: string;
    }): Promise<void> {
        console.log("Creating tweet for article:", article);
        const tweet = this.config.template
            .replace("{{title}}", article.title)
            .replace("{{url}}", article.url);

        console.log("Posting tweet:", tweet);
        await this.twitterClient.post.post(tweet);
        console.log("Tweet posted successfully");
    }
}
