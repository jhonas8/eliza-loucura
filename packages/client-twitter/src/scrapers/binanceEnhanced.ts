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
        waitTime: number = 40
    ): Promise<string> {
        const browser = await chromium.launch({
            headless: true,
        });

        let content = "";
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            elizaLogger.info(`Navigating to URL with ${waitTime}s timeout...`);
            await page.goto(url, { timeout: waitTime * 1000 });

            // Wait for the content to be loaded
            await page.waitForLoadState("domcontentloaded");
            await page.waitForLoadState("networkidle");

            // Additional wait for dynamic content
            await new Promise((resolve) => setTimeout(resolve, 5000));

            elizaLogger.info("Page loaded successfully, getting content...");
            content = await page.content();
        } catch (error) {
            elizaLogger.error("Error during page rendering:", error);
            throw error;
        } finally {
            await context.close();
            await browser.close();
            elizaLogger.info("Browser closed");
        }

        return content;
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Fetching recent Binance announcements...");
            const pageContent = await this.getRenderedContent(
                this.announcementsUrl
            );
            const $ = cheerio.load(pageContent);

            // Find all article links
            const articles: Array<{ title: string; url: string }> = [];

            $("div.css-1wr4jig")
                .find("a")
                .each((_, element) => {
                    const link = $(element);
                    const title = link.find("h3").text().trim();
                    const url = link.attr("href");

                    if (url && title) {
                        const fullUrl = url.startsWith("/")
                            ? `${this.baseUrl}${url}`
                            : url;
                        articles.push({
                            title,
                            url: fullUrl,
                        });
                        elizaLogger.info(`Found article: ${title}`);
                    }
                });

            if (articles.length === 0) {
                elizaLogger.warn("No articles found");
                return null;
            }

            // Get the first (latest) article
            const firstArticle = articles[0];
            elizaLogger.info(
                `Processing latest article: ${firstArticle.title}`
            );

            // Get article content
            const articleHtml = await this.getRenderedContent(firstArticle.url);
            const $article = cheerio.load(articleHtml);

            // Get article content
            let content = "";
            const articleContent = $article("div.css-1nfyzg8");
            if (articleContent.length) {
                content = articleContent.text().replace(/\s+/g, " ").trim();
            } else {
                // Fallback to main content area
                content = $article("main").text().replace(/\s+/g, " ").trim();
            }

            if (!content) {
                elizaLogger.warn("Could not fetch article content");
                return null;
            }

            elizaLogger.info("Successfully fetched article content");
            return {
                title: firstArticle.title,
                content,
                url: firstArticle.url,
                date: new Date(),
            };
        } catch (error) {
            elizaLogger.error("Error getting article content:", error);
            return null;
        }
    }
}
