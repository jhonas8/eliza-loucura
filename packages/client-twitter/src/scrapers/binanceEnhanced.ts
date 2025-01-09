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
            const pageContent = await this.getRenderedContent(
                this.announcementsUrl
            );
            const $ = cheerio.load(pageContent);

            // Find the first article
            const firstArticleLink = $(
                "a.text-PrimaryText.hover\\:text-PrimaryYellow"
            ).first();
            if (!firstArticleLink.length) {
                return null;
            }

            const title = firstArticleLink.find("h3").text().trim();
            const url = firstArticleLink.attr("href");
            if (!url || !title) {
                return null;
            }

            const fullUrl = url.startsWith("/") ? `${this.baseUrl}${url}` : url;

            // Get article content
            const articleHtml = await this.getRenderedContent(fullUrl);
            const $article = cheerio.load(articleHtml);
            const content = $article("body").text().replace(/\s+/g, " ").trim();

            // Try to find the date in the article, fallback to current date if not found
            const dateText =
                $article("time").attr("datetime") || new Date().toISOString();
            const date = new Date(dateText);

            return {
                title,
                content,
                url: fullUrl,
                date,
            };
        } catch (error) {
            elizaLogger.error("Error getting latest article:", error);
            return null;
        }
    }
}
