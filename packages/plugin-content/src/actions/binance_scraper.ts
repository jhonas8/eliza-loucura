import { Action } from '@eliza/core';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { TwitterClient } from '@eliza/twitter-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface BinanceScraperConfig {
    maxPosts: number;
    template?: string;
}

export class BinanceScraperAction implements Action {
    private lastProcessedUrl: string | null = null;
    private baseUrl = 'https://www.binance.com';
    private announcementsUrl = 'https://www.binance.com/en/support/announcement/c-48?c=48&type=1';
    private twitterClient: TwitterClient;

    constructor(private config: BinanceScraperConfig) {
        // Initialize Twitter client with env variables
        this.twitterClient = new TwitterClient({
            apiKey: process.env.TWITTER_API_KEY!,
            apiSecret: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });
    }

    async execute(): Promise<void> {
        try {
            const articles = await this.getRecentAnnouncements();
            if (!articles.length) return;

            // Process only the most recent article if it's new
            const latestArticle = articles[0];
            if (this.lastProcessedUrl === latestArticle.url) return;

            // Create and post tweet
            await this.createAndPostTweet(latestArticle);

            // Update last processed URL
            this.lastProcessedUrl = latestArticle.url;
        } catch (error) {
            console.error('Error in BinanceScraperAction:', error);
        }
    }

    private async getRecentAnnouncements(): Promise<Array<{ title: string; url: string }>> {
        try {
            const response = await axios.get(this.announcementsUrl);
            const $ = cheerio.load(response.data);
            const articles: Array<{ title: string; url: string }> = [];

            // Select announcement links (adjust selector based on actual HTML structure)
            $('a.text-PrimaryText').each((_, element) => {
                const $el = $(element);
                const title = $el.find('h3').text().trim();
                let url = $el.attr('href') || '';

                if (url.startsWith('/')) {
                    url = `${this.baseUrl}${url}`;
                }

                if (title && url) {
                    articles.push({ title, url });
                }
            });

            return articles.slice(0, this.config.maxPosts);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            return [];
        }
    }

    private async createAndPostTweet(article: { title: string; url: string }): Promise<void> {
        try {
            // Create tweet content using template or default format
            const template = this.config.template || '{{title}} {{url}} #Binance #Crypto';
            const tweetContent = template
                .replace('{{title}}', article.title)
                .replace('{{url}}', article.url);

            // Post to Twitter
            await this.twitterClient.post(tweetContent);
            console.log('Posted tweet:', tweetContent);
        } catch (error) {
            console.error('Error posting tweet:', error);
        }
    }
}
