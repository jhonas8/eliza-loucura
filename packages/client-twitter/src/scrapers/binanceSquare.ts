import { elizaLogger } from "@elizaos/core";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface BinanceSquareArticle {
    title: string;
    url: string;
    content: string;
    timestamp: string;
}

export class BinanceSquareScraper {
    private baseUrl: string;
    private newsUrl: string;

    constructor() {
        this.baseUrl = "https://www.binance.com";
        this.newsUrl = `${this.baseUrl}/en/square/news/all`;
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

    async getArticleLinks(): Promise<BinanceSquareArticle[]> {
        elizaLogger.info("Fetching recent Binance Square news...");

        try {
            const content = await this.getRenderedContent(this.newsUrl);
            elizaLogger.info(`Got page content, length: ${content.length}`);

            const $ = cheerio.load(content);
            const articles: BinanceSquareArticle[] = [];

            // Find all article containers
            $("div.css-vurnku").each((_, element) => {
                try {
                    const container = $(element);

                    // Get timestamp
                    const timestamp = container
                        .find("div.css-vyak18")
                        .first()
                        .text()
                        .trim();

                    // Get article link and details
                    const articleLink = container.find("a").first();
                    const title = articleLink
                        .find("h3.css-yxpvu")
                        .text()
                        .trim();
                    const content = articleLink
                        .find("div.css-10lrpzu")
                        .text()
                        .trim();
                    const link = articleLink.attr("href");

                    if (link && title && content) {
                        const fullUrl = link.startsWith("/")
                            ? `${this.baseUrl}${link}`
                            : `${this.baseUrl}/${link}`;

                        articles.push({
                            title,
                            url: fullUrl,
                            content,
                            timestamp,
                        });
                        elizaLogger.info(
                            `Found article: ${title} (${timestamp})`
                        );
                    }
                } catch (e) {
                    elizaLogger.error(`Error extracting article info: ${e}`);
                }
            });

            elizaLogger.info(`Found ${articles.length} recent news articles`);
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

            // The content is already in the preview, but if you need the full article content
            // you can extract it from the article page
            const articleContent = $("div.css-10lrpzu").text();
            return articleContent.replace(/\s+/g, " ").trim();
        } catch (e) {
            elizaLogger.error(`Error getting article content: ${e}`);
            return "";
        }
    }

    async getLatestArticle(): Promise<BinanceSquareArticle | null> {
        try {
            const articles = await this.getArticleLinks();

            if (articles.length === 0) {
                elizaLogger.warn("No news articles found");
                return null;
            }

            // Get the first article
            const firstArticle = articles[0];
            elizaLogger.info(
                `Processing latest news article: ${firstArticle.title}`
            );

            // The content is already included in the article object
            if (!firstArticle.content) {
                elizaLogger.warn("Could not fetch article content");
                return null;
            }

            return firstArticle;
        } catch (error) {
            elizaLogger.error("Error in getLatestArticle:", error);
            elizaLogger.error("Stack trace:", error.stack);
            return null;
        }
    }
}
