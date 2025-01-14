import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { elizaLogger } from "@elizaos/core";

dotenv.config();

export interface CTArticle {
    title: string;
    url: string;
    content: string;
    author: string;
    timestamp: string;
    category: string;
}

export class CoinTelegraphScraper {
    private baseUrl: string;
    private maxRetries: number;

    constructor() {
        this.baseUrl = "https://cointelegraph.com";
        this.maxRetries = 3;
    }

    private async getRenderedContent(
        url: string,
        waitTime: number = 60
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
                    "--ignore-certificate-errors",
                    "--proxy-bypass-list=*",
                    "--window-size=1920,1080",
                    "--start-maximized",
                ],
            });

            try {
                const page = await browser.newPage();

                // Set viewport and user agent
                await page.setViewport({ width: 1920, height: 1080 });
                await page.setUserAgent(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                );

                // Set additional headers
                await page.setExtraHTTPHeaders({
                    "Accept-Language": "en-US,en;q=0.9",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    Connection: "keep-alive",
                    "Accept-Encoding": "gzip, deflate, br",
                });

                // Enable JavaScript and block unnecessary resources
                await page.setJavaScriptEnabled(true);
                await page.setRequestInterception(true);
                page.on("request", (request) => {
                    const resourceType = request.resourceType();
                    if (
                        resourceType === "image" ||
                        resourceType === "stylesheet" ||
                        resourceType === "font"
                    ) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                elizaLogger.info("Navigating to page...");
                // First navigate without waiting for network idle
                await page.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: waitTime * 1000,
                });

                elizaLogger.info(
                    "Initial page load complete, waiting for content..."
                );

                // Wait for any element that indicates the page is interactive
                await page.waitForSelector("body", { timeout: 10000 });

                // Now try to wait for articles with a shorter timeout
                elizaLogger.info("Waiting for articles to appear...");
                try {
                    await page.waitForFunction(
                        () => {
                            const articles = document.querySelectorAll(
                                "article.post-card__article"
                            );
                            return articles.length > 0;
                        },
                        { timeout: 15000 }
                    );
                } catch (e) {
                    elizaLogger.info(
                        "Timeout waiting for articles, will check content anyway"
                    );
                }

                // Short pause to allow for any final rendering
                await new Promise((resolve) => setTimeout(resolve, 2000));

                elizaLogger.info("Checking page content...");
                const elements = await page.evaluate(() => {
                    // Check for article list
                    const articles = document.querySelectorAll(
                        "article.post-card__article"
                    );

                    // Check for individual article content
                    const articleContent =
                        document.querySelector(
                            'div[data-testid="post-content"]'
                        ) ||
                        document.querySelector("div.post-content") ||
                        document.querySelector("div.post__content") ||
                        document.querySelector(
                            'div[data-testid="post-content-body"]'
                        );

                    return {
                        articleCount: articles.length,
                        hasArticleContent: !!articleContent,
                        html: document.documentElement.outerHTML,
                    };
                });

                elizaLogger.info(
                    `Found ${elements.articleCount} articles in page evaluation`
                );
                elizaLogger.info(
                    `Article content present: ${elements.hasArticleContent}`
                );

                if (elements.articleCount > 0 || elements.hasArticleContent) {
                    return elements.html;
                }

                // If we didn't find articles or article content, throw an error to trigger retry
                throw new Error("No content found in the page");
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

    async getArticleLinks(): Promise<CTArticle[]> {
        elizaLogger.info("\nFetching recent CoinTelegraph news...");

        try {
            const content = await this.getRenderedContent(this.baseUrl);
            elizaLogger.info(`Got page content, length: ${content.length}`);

            const $ = cheerio.load(content);
            const articles: CTArticle[] = [];

            // Try finding articles directly
            const articleElements = $("article.post-card__article");
            elizaLogger.info(
                `Found ${articleElements.length} article elements in parsed HTML`
            );

            articleElements.each((_, element) => {
                try {
                    const article = $(element);

                    // Get header information
                    const header = article.find(
                        'header[data-testid="post-card-header"]'
                    );
                    const titleElement = header.find(
                        'span[data-testid="post-card-title"]'
                    );
                    const title = titleElement.text().trim();
                    const link = header.find("a").attr("href");

                    // Get content preview
                    const content = article
                        .find('p[data-testid="post-card-preview-text"]')
                        .text()
                        .trim();

                    // Get author
                    const authorElement = article.find(
                        'a[data-testid="post-card-author-link"] span'
                    );
                    const author = authorElement.text().trim();

                    // Get timestamp
                    const timestamp = article
                        .find('time[data-testid="post-card-published-date"]')
                        .text()
                        .trim();

                    // Get category (badge)
                    const category = article
                        .find('span[data-testid="post-card-badge"]')
                        .text()
                        .trim();

                    if (
                        link &&
                        title &&
                        !article.closest("li").find(".close-ad").length
                    ) {
                        // Skip ads
                        const fullUrl = link.startsWith("/")
                            ? `${this.baseUrl}${link}`
                            : `${this.baseUrl}/${link}`;

                        articles.push({
                            title,
                            url: fullUrl,
                            content,
                            author,
                            timestamp,
                            category,
                        });
                        elizaLogger.info(
                            `Found article: ${title} by ${author} (${timestamp})`
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

    async getArticleContent(url: string): Promise<CTArticle> {
        try {
            const content = await this.getRenderedContent(url, 30);
            const $ = cheerio.load(content);

            // Get article metadata
            const title = $("h1.post__title").text().trim();
            const author = $(".post-meta__author-name").text().trim();
            const timestamp = $(".post-meta__publish-date time").text().trim();
            const category = $(".post-cover__badge").text().trim();

            // Get article content
            let articleContent = "";

            // Process each content element in order
            $(".post-content")
                .children()
                .each((_, element) => {
                    const el = $(element);

                    // Handle paragraphs
                    if (el.is("p")) {
                        articleContent += el.text().trim() + "\n\n";
                    }

                    // Handle figures (images with captions)
                    else if (el.is("figure")) {
                        const caption = el.find("figcaption").text().trim();
                        if (caption) {
                            articleContent += `[Image: ${caption}]\n\n`;
                        }
                    }

                    // Handle blockquotes
                    else if (el.is("blockquote")) {
                        articleContent += el.text().trim() + "\n\n";
                    }

                    // Handle headers
                    else if (el.is("h2")) {
                        articleContent += `## ${el.text().trim()}\n\n`;
                    }
                });

            return {
                title,
                url,
                content: articleContent.trim(),
                author,
                timestamp,
                category,
            };
        } catch (e) {
            elizaLogger.error(`Error getting article content: ${e}`);
            throw e;
        }
    }

    async getLatestArticle(): Promise<CTArticle | null> {
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

            // Get full article content
            const fullArticle = await this.getArticleContent(firstArticle.url);
            return fullArticle;
        } catch (error) {
            elizaLogger.error("Error in getLatestArticle:", error);
            elizaLogger.error("Stack trace:", error.stack);
            return null;
        }
    }
}
