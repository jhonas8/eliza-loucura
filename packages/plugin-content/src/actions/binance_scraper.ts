import { Action, IAgentRuntime } from "@elizaos/core";
import axios from "axios";
import * as cheerio from "cheerio";
import TwitterClient from "@elizaos/client-twitter";

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
    handler = this.execute.bind(this);

    private lastProcessedArticle: string | null = null;
    private twitterClient: any;

    constructor(
        private config: BinanceScraperConfig,
        private runtime: IAgentRuntime
    ) {
        this.initTwitterClient();
    }

    private async initTwitterClient() {
        this.twitterClient = await TwitterClient.start(this.runtime);
    }

    async validate(): Promise<boolean> {
        console.log("Validating BinanceScraperAction configuration...");
        return true;
    }

    async execute(): Promise<void> {
        console.log("Starting BinanceScraperAction execution...");
        try {
            const articles = await this.getRecentAnnouncements();
            console.log(`Found ${articles.length} articles on the page`);

            if (articles.length > 0) {
                const latestArticle = articles[0];
                console.log("Latest article found:", {
                    title: latestArticle.title,
                    url: latestArticle.url,
                });

                if (latestArticle.url !== this.lastProcessedArticle) {
                    console.log("New article detected, fetching content...");
                    const content = await this.getArticleContent(
                        latestArticle.url
                    );
                    console.log(
                        "Article content preview:",
                        content.substring(0, 200) + "..."
                    );

                    await this.createAndPostTweet(latestArticle);
                    this.lastProcessedArticle = latestArticle.url;
                    console.log(
                        "Tweet posted successfully for article:",
                        latestArticle.title
                    );
                } else {
                    console.log(
                        "Article already processed:",
                        latestArticle.title
                    );
                }
            }
        } catch (error) {
            console.error("Error in BinanceScraperAction:", error);
            throw error;
        }
    }

    private async getRecentAnnouncements() {
        console.log("Fetching announcements from Binance...");
        const response = await axios.get(
            "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing"
        );
        const $ = cheerio.load(response.data);
        const articles: Array<{ title: string; url: string }> = [];

        $(".css-1wr4jig").each((_, element) => {
            const $el = $(element);
            const title = $el.find(".css-1must4f").text().trim();
            const url = $el.attr("href");

            if (title && url) {
                console.log("Found article:", { title, url });
                articles.push({ title, url: `https://www.binance.com${url}` });
            }
        });

        return articles;
    }

    private async getArticleContent(url: string): Promise<string> {
        console.log("Fetching article content from:", url);
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const content = $(".css-3fpgoh").text().trim();
        return content;
    }

    private async createAndPostTweet(article: { title: string; url: string }) {
        const tweetContent = this.config.template
            .replace("{{title}}", article.title)
            .replace("{{url}}", article.url);

        console.log("Preparing to post tweet:", tweetContent);
        await this.twitterClient.post.post(tweetContent);
    }
}
