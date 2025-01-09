import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { elizaLogger } from "@elizaos/core";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceEnhancedScraper {
    private baseUrl: string;
    private announcementsUrl: string;

    constructor() {
        this.baseUrl = "https://www.binance.com";
        this.announcementsUrl = `${this.baseUrl}/en/support/announcement/c-48?c=48&type=1`;
    }

    private async getRenderedContent(
        url: string,
        waitTime: number = 30
    ): Promise<string> {
        const browser = await chromium.launch({
            headless: true,
        });

        let content = "";
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            elizaLogger.info(`Navigating to URL with ${waitTime}s timeout...`);
            await page.goto(url, {
                timeout: waitTime * 1000,
                waitUntil: "networkidle",
            });

            // Wait for the main content to be visible
            if (url.includes("/support/announcement/c-48")) {
                // For the announcements list page
                await page.waitForSelector("a.text-PrimaryText", {
                    timeout: waitTime * 1000,
                });
            } else {
                // For individual article pages
                await page.waitForSelector("article, .css-1nfyzg8", {
                    timeout: waitTime * 1000,
                });
            }

            // Additional wait to ensure dynamic content is loaded
            await page.waitForLoadState("networkidle");
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Extra 2s safety margin

            elizaLogger.info("Page loaded successfully, getting content...");
            content = await page.content();

            return content;
        } catch (error) {
            elizaLogger.error("Error during page rendering:", error);
            throw error;
        } finally {
            try {
                await context.close();
                await browser.close();
                elizaLogger.info("Browser closed");
            } catch (error) {
                elizaLogger.error("Error closing browser:", error);
            }
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Fetching recent Binance announcements...");
            const pageContent = await this.getRenderedContent(
                this.announcementsUrl,
                40 // Increased timeout for the list page
            );
            const $ = cheerio.load(pageContent);

            // Find the first article
            const firstArticleLink = $(
                "a.text-PrimaryText.hover\\:text-PrimaryYellow"
            ).first();
            if (!firstArticleLink.length) {
                elizaLogger.warn("No article links found on the page");
                return null;
            }

            const title = firstArticleLink.find("h3").text().trim();
            const url = firstArticleLink.attr("href");
            if (!url || !title) {
                elizaLogger.warn("Missing title or URL from article link");
                return null;
            }

            const fullUrl = url.startsWith("/") ? `${this.baseUrl}${url}` : url;
            elizaLogger.info(`Found article: ${title}`);
            elizaLogger.info(`Fetching content from: ${fullUrl}`);

            // Get article content with increased timeout
            const articleHtml = await this.getRenderedContent(fullUrl, 40);
            const $article = cheerio.load(articleHtml);

            // Try different selectors for content
            const contentSelectors = [
                "article",
                ".css-1nfyzg8",
                ".announcement-content",
            ];
            let content = "";

            for (const selector of contentSelectors) {
                const element = $article(selector);
                if (element.length) {
                    content = element.text().replace(/\s+/g, " ").trim();
                    break;
                }
            }

            if (!content) {
                content = $article("body").text().replace(/\s+/g, " ").trim();
            }

            // Try to find the date in the article, fallback to current date if not found
            const dateText =
                $article("time").attr("datetime") || new Date().toISOString();
            const date = new Date(dateText);

            elizaLogger.info("Successfully fetched article content");
            return {
                title,
                content,
                url: fullUrl,
                date,
            };
        } catch (error) {
            elizaLogger.error("Error getting article content:", error);
            return null;
        }
    }
}
