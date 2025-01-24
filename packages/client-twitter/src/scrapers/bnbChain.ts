import { elizaLogger } from "@elizaos/core";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface BNBChainArticle {
    title: string;
    url: string;
    content?: string;
    date: string;
    readTime: string;
    imageUrl?: string;
}

export class BNBChainScraper {
    private baseUrl: string;
    private maxRetries: number;

    constructor() {
        this.baseUrl = "https://www.bnbchain.org/en";
        this.maxRetries = 3;
    }

    private async getRenderedContent(
        url: string,
        waitTime: number = 30
    ): Promise<string> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            elizaLogger.info(`Attempt ${attempt} of ${this.maxRetries}`);

            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-site-isolation-trials",
                ],
            });

            try {
                const page = await browser.newPage();

                await page.setViewport({ width: 1920, height: 1080 });
                await page.setUserAgent(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                );

                elizaLogger.info("Navigating to page...");
                await page.goto(url, {
                    waitUntil: "networkidle0",
                    timeout: waitTime * 1000,
                });

                await page.waitForSelector('[data-theme="light"]');

                const content = await page.content();
                await browser.close();
                return content;
            } catch (e) {
                lastError = e as Error;
                elizaLogger.error(`Attempt ${attempt} failed:`, e);
                await browser.close();

                if (attempt < this.maxRetries) {
                    elizaLogger.info(`Waiting before retry...`);
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
                continue;
            }
        }

        throw lastError || new Error("All attempts failed");
    }

    async getArticleLinks(): Promise<BNBChainArticle[]> {
        elizaLogger.info("Fetching recent BNB Chain blog posts...");

        try {
            const content = await this.getRenderedContent(`${this.baseUrl}`);
            elizaLogger.info("Page content loaded, searching for articles...");

            const $ = cheerio.load(content);
            const articles: BNBChainArticle[] = [];

            // Find all article links within Swiper slides
            $('.swiper-slide a[data-theme="light"].css-1ctnwff').each(
                (_, element) => {
                    try {
                        const article = $(element);
                        const title = article
                            .find(".chakra-text.css-fe0u8e")
                            .text()
                            .trim();
                        const link = article.attr("href");
                        const imageUrl = article.find("img").attr("src");
                        const metaDiv = article.find(".css-mxz1nf");
                        const dateDivs = metaDiv.find(".css-czwlum");
                        const date = dateDivs.first().text().trim();
                        const readTime = dateDivs.last().text().trim();

                        if (link && title) {
                            const fullUrl = link.startsWith("/")
                                ? `${this.baseUrl}${link.replace("/en/", "/")}`
                                : link;

                            articles.push({
                                title,
                                url: fullUrl,
                                date,
                                readTime,
                                imageUrl,
                            });
                            elizaLogger.info(`Found article: ${title}`);
                        }
                    } catch (e) {
                        elizaLogger.error(
                            `Error extracting article info: ${e}`
                        );
                    }
                }
            );

            // If no articles found in carousel, try the blog page directly
            if (articles.length === 0) {
                elizaLogger.info(
                    "No articles found in carousel, trying blog page directly..."
                );
                const blogContent = await this.getRenderedContent(
                    `${this.baseUrl}/blog`
                );
                const $blog = cheerio.load(blogContent);

                $blog('a[data-theme="light"].css-1ctnwff').each(
                    (_, element) => {
                        try {
                            const article = $blog(element);
                            const title = article
                                .find(".chakra-text.css-fe0u8e")
                                .text()
                                .trim();
                            const link = article.attr("href");
                            const imageUrl = article.find("img").attr("src");
                            const metaDiv = article.find(".css-mxz1nf");
                            const dateDivs = metaDiv.find(".css-czwlum");
                            const date = dateDivs.first().text().trim();
                            const readTime = dateDivs.last().text().trim();

                            if (link && title) {
                                const fullUrl = link.startsWith("/")
                                    ? `${this.baseUrl}${link.replace("/en/", "/")}`
                                    : link;

                                articles.push({
                                    title,
                                    url: fullUrl,
                                    date,
                                    readTime,
                                    imageUrl,
                                });
                                elizaLogger.info(
                                    `Found article on blog page: ${title}`
                                );
                            }
                        } catch (e) {
                            elizaLogger.error(
                                `Error extracting article info from blog page: ${e}`
                            );
                        }
                    }
                );
            }

            elizaLogger.info(`Found ${articles.length} recent blog posts`);
            return articles;
        } catch (e) {
            elizaLogger.error(`Error getting article links: ${e}`);
            return [];
        }
    }

    async getArticleContent(url: string): Promise<string> {
        try {
            elizaLogger.info(`Fetching article content from: ${url}`);
            const content = await this.getRenderedContent(url);
            const $ = cheerio.load(content);

            // Get article container
            const articleContainer = $('div[data-theme="light"].css-xd0az');

            // Get article content
            const articleContent =
                articleContainer.find(".css-1186abx").text() || "";
            return articleContent.trim();
        } catch (e) {
            elizaLogger.error(`Error getting article content: ${e}`);
            return "";
        }
    }

    async getLatestArticle(): Promise<BNBChainArticle | null> {
        try {
            const articles = await this.getArticleLinks();

            if (articles.length === 0) {
                elizaLogger.warn("No articles found");
                return null;
            }

            // Get the first article
            const firstArticle = articles[0];
            elizaLogger.info(
                `Processing latest article: ${firstArticle.title}`
            );

            // Get the full article content
            const content = await this.getArticleContent(firstArticle.url);
            if (content) {
                firstArticle.content = content;
            }

            return firstArticle;
        } catch (error) {
            elizaLogger.error("Error in getLatestArticle:", error);
            elizaLogger.error("Stack trace:", error.stack);
            return null;
        }
    }
}
