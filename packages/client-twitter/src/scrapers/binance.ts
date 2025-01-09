import { elizaLogger } from "@elizaos/core";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceScraper {
    private baseUrl =
        "https://www.binance.com/en/support/announcement/c-48?c=48&type=1";

    private async getRenderedContent(
        url: string,
        waitTime: number = 30
    ): Promise<string> {
        elizaLogger.info(`Launching browser to fetch content from: ${url}`);
        const browser = await chromium.launch({
            headless: true,
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            elizaLogger.info(`Navigating to URL with ${waitTime}s timeout...`);
            await page.goto(url, { timeout: waitTime * 1000 });
            elizaLogger.info("Waiting for network to be idle...");
            await page.waitForLoadState("networkidle");
            elizaLogger.info("Page loaded successfully, getting content...");
            const content = await page.content();
            elizaLogger.info(
                `Retrieved content length: ${content.length} characters`
            );
            return content;
        } catch (error) {
            elizaLogger.error(`Error during page rendering: ${error.message}`);
            throw error;
        } finally {
            await browser.close();
            elizaLogger.info("Browser closed");
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Starting to fetch latest Binance article...");
            const html = await this.getRenderedContent(this.baseUrl);
            elizaLogger.info("Parsing HTML with cheerio...");
            const $ = cheerio.load(html);

            // Find the first article
            const articleSelector =
                "a.text-PrimaryText.hover\\:text-PrimaryYellow";
            elizaLogger.info(
                `Looking for articles using selector: ${articleSelector}`
            );
            const allArticles = $(articleSelector);
            elizaLogger.info(`Found ${allArticles.length} total articles`);

            const firstArticleLink = allArticles.first();
            if (!firstArticleLink.length) {
                elizaLogger.warn(
                    `No articles found on Binance announcements page. HTML snippet: ${html.substring(0, 500)}...`
                );
                return null;
            }

            elizaLogger.info("Found first article, extracting details...");
            const title = firstArticleLink.find("h3").text().trim();
            elizaLogger.info(`Extracted title: ${title}`);

            const url = firstArticleLink.attr("href");
            elizaLogger.info(`Extracted URL: ${url}`);

            const dateText = firstArticleLink.find("time").attr("datetime");
            elizaLogger.info(`Extracted date: ${dateText}`);

            if (!url || !title) {
                elizaLogger.warn(
                    `Missing required data - URL: ${!!url}, Title: ${!!title}`
                );
                elizaLogger.warn(
                    `Article link HTML: ${firstArticleLink.html()}`
                );
                return null;
            }

            const fullUrl = url.startsWith("/")
                ? `https://www.binance.com${url}`
                : url;
            elizaLogger.info(`Constructed full URL: ${fullUrl}`);

            // Get the full article content
            elizaLogger.info("Fetching full article content...");
            const articleHtml = await this.getRenderedContent(fullUrl);
            const $article = cheerio.load(articleHtml);
            const content = $article("body").text().replace(/\s+/g, " ").trim();
            elizaLogger.info(
                `Extracted content length: ${content.length} characters`
            );

            const article = {
                title,
                content,
                url: fullUrl,
                date: new Date(dateText || new Date().toISOString()),
            };
            elizaLogger.info("Successfully created article object:", article);
            return article;
        } catch (error) {
            elizaLogger.error("Error in getLatestArticle:", error);
            elizaLogger.error("Stack trace:", error.stack);
            return null;
        }
    }
}
