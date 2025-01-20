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

Write an engaging tweet about this Binance ${isNews ? "news article" : "announcement"}:

Title: ${article.title}
Content: ${article.content ? article.content.substring(0, 500) : ""}...

Example tweets from you:
${this.runtime.character.postExamples.join("\n")}

The tweet should:
1. Summarize the key points in a concise way and include your opinion
2. Use informal tone and style common in crypto Twitter (for younger audience)
3. Include crypto slang and abbreviations when relevant (e.g., WAGMI, gm, HODL)
4. Use line breaks strategically for better readability
5. Not exceed ${requestShorter ? "200" : "280"} characters
6. Include relevant crypto symbols if mentioned (e.g. $BTC, $ETH)
7. Do not use any emojis or hashtags, remove any hashtags from the article. Do not use any emojis or hashtags.
8. Maintain your unique personality traits and style${requestShorter ? "\n9. Make it shorter than the previous attempt" : ""}

Format example:
Key update in one line

Your opinion/reaction

Additional context (if needed)

Write the tweet text without any surrounding quotes:`;

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
