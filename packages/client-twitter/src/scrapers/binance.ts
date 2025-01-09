import { elizaLogger } from "@elizaos/core";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceScraper {
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
        elizaLogger.info(`Launching browser to fetch content from: ${url}`);
        const browser = await puppeteer.launch({
            headless: true,
        });
        const page = await browser.newPage();

        try {
            elizaLogger.info(`Navigating to URL with ${waitTime}s timeout...`);
            await page.goto(url, {
                waitUntil: "networkidle0",
                timeout: waitTime * 1000,
            });
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

    async getArticleLinks(): Promise<Array<{ title: string; url: string }>> {
        elizaLogger.info("Fetching recent Binance announcements...");

        try {
            const content = await this.getRenderedContent(
                this.announcementsUrl
            );
            elizaLogger.info(`Got page content, length: ${content.length}`);

            const $ = cheerio.load(content);
            const articles: Array<{ title: string; url: string }> = [];

            $(
                "a.text-PrimaryText.hover\\:text-PrimaryYellow.active\\:text-PrimaryYellow.focus\\:text-PrimaryYellow.cursor-pointer.no-underline.w-fit"
            ).each((_, element) => {
                try {
                    const titleEl = $(element).find("h3");
                    if (!titleEl.length) return;

                    const title = titleEl.text().trim();
                    let link = $(element).attr("href");

                    if (link && title) {
                        elizaLogger.info(`Link: ${link}`);
                        elizaLogger.info(`Title: ${title}`);

                        const fullUrl = link.startsWith("/")
                            ? `${this.baseUrl}${link}`
                            : `${this.baseUrl}/${link}`;

                        articles.push({
                            title,
                            url: fullUrl,
                        });
                        elizaLogger.info(`Found article: ${title}`);
                    }
                } catch (e) {
                    elizaLogger.error(`Error extracting article info: ${e}`);
                }
            });

            elizaLogger.info(`Found ${articles.length} recent announcements`);
            return articles;
        } catch (e) {
            elizaLogger.error(`Error getting article links: ${e}`);
            return [];
        }
    }

    async getArticleContent(url: string): Promise<string> {
        try {
            const content = await this.getRenderedContent(url, 15);
            const $ = cheerio.load(content);

            // Get text content and clean it up
            const textContent = $("body").text();
            return textContent.replace(/\s+/g, " ").trim();
        } catch (e) {
            elizaLogger.error(`Error getting article content: ${e}`);
            return "";
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            const articles = await this.getArticleLinks();

            if (articles.length === 0) {
                elizaLogger.warn("No articles found");
                return null;
            }

            // Get the first article's content
            const firstArticle = articles[0];
            elizaLogger.info(
                `Processing latest article: ${firstArticle.title}`
            );

            const content = await this.getArticleContent(firstArticle.url);

            if (!content) {
                elizaLogger.warn("Could not fetch article content");
                return null;
            }

            return {
                title: firstArticle.title,
                content,
                url: firstArticle.url,
                date: new Date(), // Since date is not critical for our use case
            };
        } catch (error) {
            elizaLogger.error("Error in getLatestArticle:", error);
            elizaLogger.error("Stack trace:", error.stack);
            return null;
        }
    }
}
