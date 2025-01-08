import { elizaLogger } from "@elizaos/core";
import puppeteer from "puppeteer";
import { Page } from "puppeteer";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceScraper {
    private baseUrl = "https://www.binance.com/en/news";
    private page: Page | null = null;

    async init() {
        try {
            const browser = await puppeteer.launch({
                headless: "new",
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",
                ],
                ignoreDefaultArgs: ["--enable-automation"],
                env: {
                    ...process.env,
                    DISPLAY: undefined,
                    XAUTHORITY: undefined,
                },
            });

            this.page = await browser.newPage();
            await this.page.setViewport({ width: 1366, height: 768 });

            // Disable unnecessary features that might cause issues
            await this.page.setRequestInterception(true);
            this.page.on("request", (request) => {
                const resourceType = request.resourceType();
                if (
                    resourceType === "image" ||
                    resourceType === "font" ||
                    resourceType === "media"
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
        } catch (error) {
            elizaLogger.error("Error initializing BinanceScraper:", error);
            throw error;
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            if (!this.page) {
                await this.init();
            }

            elizaLogger.info("Fetching latest Binance article...");
            await this.page.goto(this.baseUrl, {
                waitUntil: "networkidle0",
                timeout: 30000,
            });

            // Wait for the articles to load
            await this.page.waitForSelector(".css-1wr4jig");

            // Get the first (latest) article
            const firstArticle = await this.page.evaluate(() => {
                const articleElement = document.querySelector(".css-1wr4jig");
                if (!articleElement) return null;

                const titleElement = articleElement.querySelector("h2");
                const linkElement = articleElement.querySelector("a");
                const dateElement = articleElement.querySelector("time");

                return {
                    title: titleElement?.textContent?.trim() || "",
                    url: linkElement?.href || "",
                    date:
                        dateElement?.getAttribute("datetime") ||
                        new Date().toISOString(),
                };
            });

            if (!firstArticle) {
                elizaLogger.warn("No articles found on Binance news page");
                return null;
            }

            // Navigate to the article page to get its content
            await this.page.goto(firstArticle.url, {
                waitUntil: "networkidle0",
                timeout: 30000,
            });

            // Get the article content
            const content = await this.page.evaluate(() => {
                const articleContent = document.querySelector(".css-1nfyzg8");
                return articleContent?.textContent?.trim() || "";
            });

            return {
                title: firstArticle.title,
                content: content,
                url: firstArticle.url,
                date: new Date(firstArticle.date),
            };
        } catch (error) {
            elizaLogger.error("Error fetching Binance article:", error);
            return null;
        }
    }

    async close() {
        if (this.page) {
            const browser = this.page.browser();
            await browser.close();
            this.page = null;
        }
    }
}
