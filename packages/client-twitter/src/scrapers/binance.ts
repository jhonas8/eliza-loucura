import { elizaLogger } from "@elizaos/core";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceScraper {
    private baseUrl = "https://www.binance.com/en/news";
    private browserlessApiKey = process.env.BROWSERLESS_API_KEY;
    private browserlessUrl = `https://chrome.browserless.io/content?token=${this.browserlessApiKey}`;

    private async fetchRenderedContent(url: string): Promise<string> {
        try {
            const response = await fetch(this.browserlessUrl, {
                method: "POST",
                headers: {
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url,
                    waitFor: ".css-1wr4jig", // Wait for article container
                    gotoOptions: {
                        waitUntil: "networkidle0",
                        timeout: 30000,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            elizaLogger.error("Error fetching rendered content:", error);
            throw error;
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Fetching latest Binance article...");
            const html = await this.fetchRenderedContent(this.baseUrl);
            const $ = cheerio.load(html);

            // Get the first article
            const firstArticle = $(".css-1wr4jig").first();
            if (!firstArticle.length) {
                elizaLogger.warn("No articles found on Binance news page");
                return null;
            }

            const title = firstArticle.find("h2").text().trim();
            const url = firstArticle.find("a").attr("href");
            const dateText =
                firstArticle.find("time").attr("datetime") ||
                new Date().toISOString();

            if (!url || !title) {
                elizaLogger.warn("Could not extract article details");
                return null;
            }

            // Get the full article content
            const articleHtml = await this.fetchRenderedContent(url);
            const $article = cheerio.load(articleHtml);
            const content = $article(".css-1nfyzg8").text().trim();

            return {
                title,
                content,
                url,
                date: new Date(dateText),
            };
        } catch (error) {
            elizaLogger.error("Error fetching Binance article:", error);
            return null;
        }
    }
}
