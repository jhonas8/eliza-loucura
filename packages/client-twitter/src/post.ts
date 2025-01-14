import {
    IAgentRuntime,
    elizaLogger,
    ITextGenerationService,
} from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { CoinTelegraphScraper, CTArticle } from "./scrapers/cointelegraph";
import { OpenAIService } from "../../plugin-node/src/services/openai";

export class TwitterPostClient {
    private lastArticleUrl: string | null = null;
    private ctScraper: CoinTelegraphScraper;
    private textGenService: ITextGenerationService;

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.ctScraper = new CoinTelegraphScraper();

        // Initialize OpenAI service
        this.textGenService = new OpenAIService();
        this.textGenService.initialize(this.runtime);
        this.runtime.registerService(this.textGenService);
    }

    private async generateTweetFromArticle(
        article: CTArticle
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

Write an engaging tweet about this crypto news article:

Title: ${article.title}
Author: ${article.author}
Category: ${article.category}
Content: ${article.content.substring(0, 500)}...

Example tweets from you:
${this.runtime.character.postExamples.join("\n")}

The tweet should:
1. Be informative but concise
2. Include the most important points from the article
3. Use appropriate crypto terminology
4. Be engaging and professional
5. Not exceed ${requestShorter ? "200" : "280"} characters
6. Include relevant crypto symbols if mentioned (e.g. $BTC, $ETH)
7. Add relevant hashtags (max 2)
8. Maintain your unique personality traits and style${requestShorter ? "\n9. Make it shorter than the previous attempt" : ""}

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

    private async checkAndTweetNewArticle(): Promise<void> {
        try {
            const article = await this.ctScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No article found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    "twitter/last_ct_article_url"
                );

            if (lastProcessedUrl === article.url) {
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
                    "Successfully tweeted about new CoinTelegraph article"
                );

                // Cache the processed article URL
                await this.runtime.cacheManager.set(
                    "twitter/last_ct_article_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewArticle:", error);
        }
    }

    async start() {
        elizaLogger.log("Starting CoinTelegraph news monitoring...");

        // Check for new content every minute
        setInterval(
            async () => {
                await this.checkAndTweetNewArticle();
            },
            60 * 1000 // 1 minute
        );

        // Initial check
        await this.checkAndTweetNewArticle();
    }
}
