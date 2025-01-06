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
        console.log('Initializing BinanceScraperAction with config:', config);
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
            console.log('Starting BinanceScraperAction execution...');
            const articles = await this.getRecentAnnouncements();
            console.log('Found articles:', articles);

            if (!articles.length) {
                console.log('No articles found');
                return;
            }

            // Process only the most recent article if it's new
            const latestArticle = articles[0];
            console.log('Latest article:', latestArticle);

            if (this.lastProcessedUrl === latestArticle.url) {
                console.log('Article already processed:', latestArticle.url);
                return;
            }

            // Create and post tweet
            await this.createAndPostTweet(latestArticle);

            // Update last processed URL
            this.lastProcessedUrl = latestArticle.url;
            console.log('Updated lastProcessedUrl to:', this.lastProcessedUrl);
        } catch (error) {
            console.error('Error in BinanceScraperAction:', error);
        }
    }

    private async getRecentAnnouncements(): Promise<Array<{ title: string; url: string }>> {
        try {
            console.log('Fetching announcements from:', this.announcementsUrl);
            const response = await axios.get(this.announcementsUrl);
            console.log('Got response, parsing HTML...');

            const $ = cheerio.load(response.data);
            const articles: Array<{ title: string; url: string }> = [];

            // Updated selector to match Binance's structure
            $('.css-1wr4jig').each((_, element) => {
                const $el = $(element);
                const title = $el.find('.css-1must4f').text().trim();
                let url = $el.attr('href') || '';

                console.log('Found element:', { title, url });

                if (url.startsWith('/')) {
                    url = `${this.baseUrl}${url}`;
                }

                if (title && url) {
                    articles.push({ title, url });
                    console.log('Added article:', { title, url });
                }
            });

            const result = articles.slice(0, this.config.maxPosts);
            console.log(`Returning ${result.length} articles:`, result);
            return result;
        } catch (error) {
            console.error('Error fetching announcements:', error);
            return [];
        }
    }

    private async createAndPostTweet(article: { title: string; url: string }): Promise<void> {
        try {
            // Create tweet content using template or default format
            const template = this.config.template || '🚀 {{title}} \n\nRead more: {{url}} \n\n#Binance #Crypto';
            const tweetContent = template
                .replace('{{title}}', article.title)
                .replace('{{url}}', article.url);

            console.log('Creating tweet with content:', tweetContent);

            // Post to Twitter
            await this.twitterClient.post(tweetContent);
            console.log('Successfully posted tweet:', tweetContent);
        } catch (error) {
            console.error('Error posting tweet:', error);
        }
    }
}
