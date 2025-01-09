import { elizaLogger } from "@elizaos/core";
import * as cheerio from "cheerio";
import axios from "axios";

export interface BinanceArticle {
    title: string;
    content: string;
    url: string;
    date: Date;
}

export class BinanceScraper {
    private baseUrl = "https://www.binance.com/en/news";
    private axiosInstance = axios.create({
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
        },
    });

    private async fetchContent(url: string): Promise<string> {
        try {
            const response = await this.axiosInstance.get(url);
            return response.data;
        } catch (error) {
            elizaLogger.error("Error fetching content:", error);
            throw error;
        }
    }

    async getLatestArticle(): Promise<BinanceArticle | null> {
        try {
            elizaLogger.info("Fetching latest Binance article...");
            const html = await this.fetchContent(this.baseUrl);
            const $ = cheerio.load(html);

            // Get the first article
            const firstArticle = $(".css-1wr4jig").first();
            if (!firstArticle.length) {
                elizaLogger.warn("No articles found on Binance news page");
                return null;
            }

            const title = firstArticle.find("h2").text().trim();
            const url = firstArticle.find("a").attr("href");
            const dateText =
                firstArticle.find("time").attr("datetime") ||
                new Date().toISOString();

            if (!url || !title) {
                elizaLogger.warn("Could not extract article details");
                return null;
            }

            // Get the full article content
            const articleHtml = await this.fetchContent(url);
            const $article = cheerio.load(articleHtml);
            const content = $article(".css-1nfyzg8").text().trim();

            return {
                title,
                content,
                url,
                date: new Date(dateText),
            };
        } catch (error) {
            elizaLogger.error("Error fetching Binance article:", error);
            return null;
        }
    }
}
