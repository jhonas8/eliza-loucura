import {
    IAgentRuntime,
    elizaLogger,
    ITextGenerationService,
    ServiceType,
} from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { BinanceScraper, BinanceArticle } from "./scrapers/binance.ts";
import { BinanceEnhancedScraper } from "./scrapers/binanceEnhanced";

export class TwitterPostClient {
    private lastArticleUrl: string | null = null;
    private binanceScraper: BinanceScraper;
    private binanceEnhancedScraper: BinanceEnhancedScraper;
    private postInterval: number;
    private postImmediately: boolean;

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.binanceScraper = new BinanceScraper();
        this.binanceEnhancedScraper = new BinanceEnhancedScraper();
        this.postInterval = Math.floor(
            Math.random() *
                (this.client.twitterConfig.POST_INTERVAL_MAX -
                    this.client.twitterConfig.POST_INTERVAL_MIN) +
                this.client.twitterConfig.POST_INTERVAL_MIN
        );
        this.postImmediately = this.client.twitterConfig.POST_IMMEDIATELY;
    }

    private async generateTweetFromArticle(
        article: BinanceArticle
    ): Promise<string> {
        const textGenService = this.runtime.getService<ITextGenerationService>(
            ServiceType.TEXT_GENERATION
        );
        if (!textGenService) {
            throw new Error("Text generation service not available");
        }

        const generateTweet = async (
            requestShorter: boolean = false
        ): Promise<string> => {
            const prompt = `You are a crypto expert and enthusiast. Write an engaging tweet about this Binance news article:
Title: ${article.title}
Content: ${article.content.substring(0, 500)}...

The tweet should:
1. Be informative but concise
2. Include key points from the article
3. Use appropriate crypto terminology
4. Be engaging and professional
5. Leave room for the URL at the end
6. Not exceed ${requestShorter ? "200" : "240"} characters (excluding URL)${requestShorter ? "\n7. Make it shorter than the previous attempt" : ""}

Write only the tweet text:`;

            const response = await textGenService.queueTextCompletion(
                prompt,
                0.7,
                [],
                0,
                0,
                240
            );

            return response.trim();
        };

        let tweetText = await generateTweet();
        const urlLength = article.url.length + 1; // +1 for the space

        // If tweet + URL exceeds Twitter's limit, try again with a shorter request
        if (tweetText.length + urlLength > 280) {
            elizaLogger.info("Tweet too long, generating shorter version...");
            tweetText = await generateTweet(true);
        }

        return `${tweetText} ${article.url}`;
    }

    private async checkAndTweetNewArticle(): Promise<void> {
        try {
            const article = await this.binanceScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No article found");
                return;
            }

            // Check if we've already tweeted about this article
            if (this.lastArticleUrl === article.url) {
                elizaLogger.info("Article already tweeted");
                return;
            }

            // Generate and post the tweet
            const tweetText = await this.generateTweetFromArticle(article);

            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", tweetText);
            } else {
                await this.client.twitterClient.sendTweet(tweetText);
                elizaLogger.info(
                    "Successfully tweeted about new Binance article"
                );
            }

            // Update the last article URL
            this.lastArticleUrl = article.url;
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewArticle:", error);
        }
    }

    private async generateNewTweet(): Promise<void> {
        try {
            const state = await this.runtime.composeState({} as any);
            const textGenService =
                this.runtime.getService<ITextGenerationService>(
                    ServiceType.TEXT_GENERATION
                );
            if (!textGenService) {
                throw new Error("Text generation service not available");
            }

            const generateTweet = async (
                requestShorter: boolean = false
            ): Promise<string> => {
                const prompt = `You are ${this.runtime.character.name}, a ${
                    this.runtime.character.bio
                }. Write a tweet that matches your personality.

Directions:
${this.client.directions}

Additional context:
${JSON.stringify(state, null, 2)}

Requirements:
1. Must not exceed ${requestShorter ? "200" : "240"} characters
2. Must be engaging and informative${requestShorter ? "\n3. Make it shorter than the previous attempt" : ""}

Write only the tweet text:`;

                return await textGenService.queueTextCompletion(
                    prompt,
                    this.client.temperature,
                    [],
                    0,
                    0,
                    240
                );
            };

            let response = await generateTweet();

            // If tweet exceeds Twitter's limit, try again with a shorter request
            if (response.length > 280) {
                elizaLogger.info(
                    "Tweet too long, generating shorter version..."
                );
                response = await generateTweet(true);
            }

            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", response);
            } else {
                await this.client.twitterClient.sendTweet(response);
                elizaLogger.info("Posted new tweet:", response);
            }
        } catch (error) {
            elizaLogger.error("Error generating tweet:", error);
        }
    }

    private async checkAndTweetNewBinanceEnhancedArticle(): Promise<void> {
        try {
            const article =
                await this.binanceEnhancedScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No enhanced article found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.client.runtime.cacheManager.get<string>(
                    "twitter/last_binance_enhanced_article_url"
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("Enhanced article already processed");
                return;
            }

            // Generate and post the tweet
            const tweetText =
                await this.generateEnhancedTweetFromArticle(article);

            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", tweetText);
            } else {
                await this.client.twitterClient.sendTweet(tweetText);
                elizaLogger.info(
                    "Successfully tweeted enhanced Binance article"
                );

                // Cache the processed article URL
                await this.client.runtime.cacheManager.set(
                    "twitter/last_binance_enhanced_article_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error(
                "Error in enhanced Binance article processing:",
                error
            );
        }
    }

    private async generateEnhancedTweetFromArticle(
        article: BinanceArticle
    ): Promise<string> {
        const textGenService = this.runtime.getService<ITextGenerationService>(
            ServiceType.TEXT_GENERATION
        );

        if (!textGenService) {
            throw new Error("Text generation service not available");
        }

        const generateTweet = async (
            requestShorter: boolean = false
        ): Promise<string> => {
            const prompt = `You are ${this.runtime.character.name}, a crypto expert and enthusiast.
Write an engaging tweet about this Binance news article:

Title: ${article.title}
Content: ${article.content.substring(0, 1000)}...

The tweet should:
1. Be informative but concise
2. Include the most important points from the article
3. Use appropriate crypto terminology
4. Be engaging and professional
5. Leave room for the URL at the end
6. Not exceed ${requestShorter ? "200" : "240"} characters (excluding URL)
7. Include relevant crypto symbols if mentioned (e.g. $BTC, $ETH)
8. Add relevant hashtags (max 2)
9. Maintain your unique personality as ${this.runtime.character.name}${requestShorter ? "\n10. Make it shorter than the previous attempt" : ""}

Character's Bio: ${this.runtime.character.bio}
Character's Style: ${this.client.directions}

Write only the tweet text:`;

            return await textGenService.queueTextCompletion(
                prompt,
                0.7,
                [],
                0,
                0,
                240
            );
        };

        let tweetText = await generateTweet();
        const urlLength = article.url.length + 1; // +1 for the space

        // If tweet + URL exceeds Twitter's limit, try again with a shorter request
        if (tweetText.length + urlLength > 280) {
            elizaLogger.info("Tweet too long, generating shorter version...");
            tweetText = await generateTweet(true);
        }

        return `${tweetText} ${article.url}`;
    }

    async start() {
        elizaLogger.log("Tweet generation loop started");

        // Regular personality-based tweets
        const tweetLoop = async () => {
            await this.generateNewTweet();
            setTimeout(tweetLoop, this.postInterval * 60 * 1000);
        };

        if (this.postImmediately) {
            await tweetLoop();
        } else {
            setTimeout(tweetLoop, this.postInterval * 60 * 1000);
        }

        // Both Binance article monitoring systems
        setInterval(
            async () => {
                await this.checkAndTweetNewArticle(); // Original
                await this.checkAndTweetNewBinanceEnhancedArticle(); // Enhanced
            },
            5 * 60 * 1000
        );

        // Initial checks
        await this.checkAndTweetNewArticle();
        await this.checkAndTweetNewBinanceEnhancedArticle();
    }
}
