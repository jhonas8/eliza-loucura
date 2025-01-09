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
        const browser = await chromium.launch({
            headless: true,
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(url, { timeout: waitTime * 1000 });
            await page.waitForLoadState("networkidle");
            const content = await page.content();
            return content;
        } finally {
            await browser.close();
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Fetching latest Binance article...");
            const html = await this.getRenderedContent(this.baseUrl);
            const $ = cheerio.load(html);

            // Find the first article
            const firstArticleLink = $(
                "a.text-PrimaryText.hover\\:text-PrimaryYellow"
            ).first();
            if (!firstArticleLink.length) {
                elizaLogger.warn(
                    "No articles found on Binance announcements page"
                );
                return null;
            }

            const title = firstArticleLink.find("h3").text().trim();
            const url = firstArticleLink.attr("href");
            const dateText =
                firstArticleLink.find("time").attr("datetime") ||
                new Date().toISOString();

            if (!url || !title) {
                elizaLogger.warn("Could not extract article details");
                return null;
            }

            const fullUrl = url.startsWith("/")
                ? `https://www.binance.com${url}`
                : url;

            // Get the full article content
            const articleHtml = await this.getRenderedContent(fullUrl);
            const $article = cheerio.load(articleHtml);
            const content = $article("body").text().replace(/\s+/g, " ").trim();

            return {
                title,
                content,
                url: fullUrl,
                date: new Date(dateText),
            };
        } catch (error) {
            elizaLogger.error("Error fetching Binance article:", error);
            return null;
        }
    }
}
