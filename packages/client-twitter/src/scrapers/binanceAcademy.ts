import { elizaLogger } from "@elizaos/core";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface AcademyArticle {
    title: string;
    url: string;
    content?: string;
    difficulty: string;
    categories: string[];
    readTime: string;
    imageUrl?: string;
}

export class BinanceAcademyScraper {
    private readonly baseUrl: string;
    private readonly maxRetries: number;

    constructor() {
        this.baseUrl = "https://academy.binance.com/en";
        this.maxRetries = 3;
    }

    private async getRenderedContent(
        url: string,
        waitTime: number = 30
    ): Promise<string> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            elizaLogger.info(
                `Attempt ${attempt} of ${this.maxRetries} to fetch: ${url}`
            );

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
                const response = await page.goto(url, {
                    waitUntil: ["networkidle0", "domcontentloaded"],
                    timeout: waitTime * 1000,
                });

                // Check response status
                const status = response?.status() || 0;
                if (status === 404) {
                    elizaLogger.warn("Page returned 404 status!");
                    await browser.close();
                    return "";
                }

                // Wait for the page to be fully loaded
                await page.waitForFunction(
                    () => {
                        return document.readyState === "complete";
                    },
                    { timeout: waitTime * 1000 }
                );

                // Check if we're on a 404 page
                const is404 = await page.evaluate(() => {
                    return (
                        !!document.querySelector(".not-fount-container") ||
                        document.title.toLowerCase().includes("404") ||
                        document.body.textContent
                            ?.toLowerCase()
                            .includes("page not found")
                    );
                });

                if (is404) {
                    elizaLogger.warn("Detected 404 page content!");
                    await browser.close();
                    return "";
                }

                // Wait a bit for any dynamic content
                await new Promise((resolve) => setTimeout(resolve, 2000));

                const content = await page.content();
                elizaLogger.info(
                    `Full page content retrieved (${content.length} characters)`
                );

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

    async getArticleLinks(): Promise<AcademyArticle[]> {
        try {
            elizaLogger.info(`Fetching articles from main page...`);
            const content = await this.getRenderedContent(this.baseUrl);
            const $ = cheerio.load(content);
            const articles: AcademyArticle[] = [];

            // Find all article links on the main page
            $('a[href^="/en/articles/"]').each((_, element) => {
                const link = $(element);
                const href = link.attr("href");
                if (!href || href.includes("#")) return;

                const card = link.find(".css-vurnku").first();
                if (!card.length) return;

                const title = card.find(".css-167u0ui").text().trim();
                if (!title) return;

                const difficulty = card.find(".css-7iavxy").text().trim();
                const categories = card
                    .find(".bg-Input.rounded-md")
                    .map((_, el) => $(el).text().trim())
                    .get();
                const readTime = card.find(".t-body3").text().trim();

                const imageDiv = card.find(".css-1ijsib6");
                const backgroundStyle = imageDiv.attr("style") || "";
                const imageMatch = backgroundStyle.match(/url\("([^"]+)"\)/);
                const imageUrl = imageMatch ? imageMatch[1] : "";

                articles.push({
                    title,
                    url: `${this.baseUrl}${href}`,
                    difficulty,
                    categories,
                    readTime,
                    imageUrl,
                });

                elizaLogger.info(`Found article: ${title}`);
            });

            elizaLogger.info(`Found ${articles.length} articles on main page`);
            return articles;
        } catch (e) {
            elizaLogger.error("Error getting article links:", e);
            return [];
        }
    }

    async getArticleContent(url: string): Promise<string> {
        try {
            const cleanUrl = url.replace(/\/en\/en\//, "/en/");
            elizaLogger.info(`Fetching article content from: ${cleanUrl}`);
            const content = await this.getRenderedContent(cleanUrl);
            const $ = cheerio.load(content);

            let articleContent = "";

            // Target spans with richtext-text class
            $("span.richtext-text").each((_, element) => {
                const text = $(element).text().trim();
                if (text) {
                    // Check if parent is a heading
                    const parent = $(element).closest("h1, h2, h3");
                    if (parent.length) {
                        const level =
                            parent.prop("tagName")?.toLowerCase() || "h1";
                        const prefix = "#".repeat(
                            parseInt(level.replace("h", ""))
                        );
                        articleContent += `${prefix} ${text}\n\n`;
                    } else if ($(element).closest("li").length) {
                        // Check if it's in a list item
                        articleContent += `• ${text}\n`;
                    } else {
                        // Regular paragraph
                        articleContent += `${text}\n\n`;
                    }
                }
            });

            elizaLogger.info(
                `Extracted ${articleContent.length} characters of content`
            );
            return articleContent.trim();
        } catch (e) {
            elizaLogger.error(`Error getting article content: ${e}`);
            return "";
        }
    }

    async getLatestArticle(): Promise<AcademyArticle | null> {
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
