import {
    IAgentRuntime,
    elizaLogger,
    ITextGenerationService,
    ServiceType,
} from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { BinanceScraper, BinanceArticle } from "./scrapers/binance.ts";

export class TwitterPostClient {
    private lastArticleUrl: string | null = null;
    private binanceScraper: BinanceScraper;
    private postInterval: number;
    private postImmediately: boolean;

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.binanceScraper = new BinanceScraper();
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
        // Use the runtime's text generation service to create a tweet about the article
        const textGenService = this.runtime.getService<ITextGenerationService>(
            ServiceType.TEXT_GENERATION
        );
        if (!textGenService) {
            throw new Error("Text generation service not available");
        }

        const prompt = `You are a crypto expert and enthusiast. Write an engaging tweet about this Binance news article:
Title: ${article.title}
Content: ${article.content.substring(0, 500)}...

The tweet should:
1. Be informative but concise
2. Include key points from the article
3. Use appropriate crypto terminology
4. Be engaging and professional
5. Leave room for the URL at the end
6. Not exceed 240 characters (excluding URL)

Write only the tweet text:`;

        const response = await textGenService.queueTextCompletion(
            prompt,
            0.7,
            [],
            0,
            0,
            100
        );

        // Add the article URL to the tweet
        return `${response.trim()} ${article.url}`;
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

            const prompt = `You are ${this.runtime.character.name}, a ${
                this.runtime.character.bio
            }. Write a tweet that matches your personality.

Directions:
${this.client.directions}

Additional context:
${JSON.stringify(state, null, 2)}

Write only the tweet text:`;

            const response = await textGenService.queueTextCompletion(
                prompt,
                this.client.temperature,
                [],
                0,
                0,
                280
            );

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

    async start() {
        elizaLogger.log("Tweet generation loop started");

        // Start regular personality-based tweet generation
        const tweetLoop = async () => {
            await this.generateNewTweet();
            setTimeout(tweetLoop, this.postInterval * 60 * 1000);
        };

        if (this.postImmediately) {
            await tweetLoop();
        } else {
            setTimeout(tweetLoop, this.postInterval * 60 * 1000);
        }

        // Start Binance article monitoring
        // Check for new articles every 5 minutes
        setInterval(
            async () => {
                await this.checkAndTweetNewArticle();
            },
            5 * 60 * 1000
        );

        // Initial article check
        await this.checkAndTweetNewArticle();
    }
}
