import {
    IAgentRuntime,
    elizaLogger,
    ITextGenerationService,
} from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { BinanceScraper, BinanceArticle } from "./scrapers/binance.ts";
import {
    BinanceSquareScraper,
    BinanceSquareArticle,
} from "./scrapers/binanceSquare";
import { OpenAIService } from "../../plugin-node/src/services/openai";

export class TwitterPostClient {
    private binanceScraper: BinanceScraper;
    private binanceSquareScraper: BinanceSquareScraper;
    private textGenService: ITextGenerationService;

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.binanceScraper = new BinanceScraper();
        this.binanceSquareScraper = new BinanceSquareScraper();

        // Initialize OpenAI service
        this.textGenService = new OpenAIService();
        this.textGenService.initialize(this.runtime);
        this.runtime.registerService(this.textGenService);
    }

    private async generateTweetFromArticle(
        article: BinanceArticle | BinanceSquareArticle,
        isNews: boolean = false
    ): Promise<string> {
        if (!this.textGenService) {
            throw new Error("Text generation service not available");
        }

        const generateTweet = async (
            requestShorter: boolean = false
        ): Promise<string> => {
            const prompt = `You are ${this.runtime.character.name}, ${this.runtime.character.bio.join(", ")}.
Your personality traits: ${this.runtime.character.adjectives.join(", ")}.
Your style: ${this.runtime.character.style.all.join(", ")}.
Your knowledge areas: ${this.runtime.character.knowledge.join(", ")}.

Write a professional, analytical tweet about this Binance ${isNews ? "news article" : "announcement"}:

Title: ${article.title}
Content: ${article.content ? article.content.substring(0, 500) : ""}...

Example tweets from you:
${this.runtime.character.postExamples.join("\n")}

Structure your tweet in this format:
1. Headline (1-2 lines): Key insight or main event
2. Supporting Data:
   - Market metrics (volume, holders, TVL)
   - Price action and trends
   - Comparative analysis with similar events/projects
3. Market Stance/Call to Action:
   - "Good entry" - for positive opportunities
   - "Watching" - for developing situations
   - "Capitalizing" - for active market plays

Guidelines:
1. Use a professional, analytical tone
2. Focus on data-driven insights and metrics
3. Include both primary and secondary market implications
4. Highlight key market indicators (volume trends, holder changes)
5. NO hashtags or emojis
6. Include relevant crypto symbols (e.g. $BTC, $ETH)
7. End with a clear market stance or call to action
8. Not exceed ${requestShorter ? "200" : "280"} characters${requestShorter ? "\n9. Make it shorter than the previous attempt" : ""}

Example format:
"$TOKEN: Key event/announcement. Supporting metrics: 24h volume +20%, holders +5%, TVL $100M (+15%). Secondary impact: sector-wide implications. Market stance: Watching for breakout."

Write only the tweet text:`;

            const response = await this.textGenService.queueTextCompletion(
                prompt,
                0.7,
                [],
                0,
                0,
                280
            );

            return response.trim();
        };

        let tweetText = await generateTweet();

        // If tweet exceeds Twitter's limit, try again with a shorter request
        if (tweetText.length > 280) {
            elizaLogger.info("Tweet too long, generating shorter version...");
            tweetText = await generateTweet(true);
        }

        return tweetText;
    }

    private async checkAndTweetNewAnnouncement(): Promise<void> {
        try {
            const article = await this.binanceScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No announcement found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    "twitter/last_binance_announcement_url"
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("Announcement already tweeted");
                return;
            }

            // Generate and post the tweet
            const tweetText = await this.generateTweetFromArticle(
                article,
                false
            );

            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", tweetText);
            } else {
                await this.client.twitterClient.sendTweet(tweetText);
                elizaLogger.info(
                    "Successfully tweeted about new Binance announcement"
                );

                // Cache the processed article URL
                await this.runtime.cacheManager.set(
                    "twitter/last_binance_announcement_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewAnnouncement:", error);
        }
    }

    private async checkAndTweetNewNews(): Promise<void> {
        try {
            const article = await this.binanceSquareScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No news article found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    "twitter/last_binance_news_url"
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("News article already tweeted");
                return;
            }

            // Generate and post the tweet
            const tweetText = await this.generateTweetFromArticle(
                article,
                true
            );

            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", tweetText);
            } else {
                await this.client.twitterClient.sendTweet(tweetText);
                elizaLogger.info(
                    "Successfully tweeted about new Binance news article"
                );

                // Cache the processed article URL
                await this.runtime.cacheManager.set(
                    "twitter/last_binance_news_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewNews:", error);
        }
    }

    async start() {
        elizaLogger.log("Starting Binance content monitoring...");

        // Check for new content every minute
        setInterval(
            async () => {
                await this.checkAndTweetNewAnnouncement();
                await this.checkAndTweetNewNews();
            },
            60 * 1000 // 1 minute
        );

        // Initial checks
        await this.checkAndTweetNewAnnouncement();
        await this.checkAndTweetNewNews();
    }
}
