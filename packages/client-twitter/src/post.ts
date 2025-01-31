import {
    IAgentRuntime,
    elizaLogger,
    ITextGenerationService,
} from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { BNBChainScraper, BNBChainArticle } from "./scrapers/bnbChain";
import {
    BinanceAcademyScraper,
    AcademyArticle,
} from "./scrapers/binanceAcademy";
import { OpenAIService } from "../../plugin-node/src/services/openai";

export class TwitterPostClient {
    private bnbChainScraper: BNBChainScraper;
    private academyScraper: BinanceAcademyScraper;
    private textGenService: ITextGenerationService;

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.bnbChainScraper = new BNBChainScraper();
        this.academyScraper = new BinanceAcademyScraper();

        // Initialize OpenAI service
        this.textGenService = new OpenAIService();
        this.textGenService.initialize(this.runtime);
        this.runtime.registerService(this.textGenService);
    }

    private async generateTweetFromArticle(
        article: BNBChainArticle | AcademyArticle,
        isAcademy: boolean = false
    ): Promise<string> {
        if (!this.textGenService) {
            throw new Error("Text generation service not available");
        }

        const cleanTweetText = (text: string): string => {
            // Remove emojis
            const emojiRegex =
                /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2B00}-\u{2BFF}]|[\u{2900}-\u{297F}]|[\u{2B00}-\u{2BFF}]|[\u{1F600}-\u{1F64F}]/gu;

            // Remove hashtags (both the symbol and word)
            const hashtagRegex = /#\w+/g;

            return text
                .replace(emojiRegex, "")
                .replace(hashtagRegex, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        const generateTweet = async (
            requestShorter: boolean = false
        ): Promise<string> => {
            const prompt = `You are ${this.runtime.character.name}, ${this.runtime.character.bio.join(", ")}.
Your personality traits: ${this.runtime.character.adjectives.join(", ")}.
Your style: ${this.runtime.character.style.all.join(", ")}.
Your knowledge areas: ${this.runtime.character.knowledge.join(", ")}.

As a BNB Chain ecosystem expert, write an engaging and educational tweet about this ${isAcademy ? "educational article" : "news update"}. Focus on explaining the significance and impact on the BNB Chain ecosystem:

Title: ${article.title}
Content: ${article.content ? article.content.substring(0, 500) : ""}...
${
    isAcademy
        ? `Difficulty: ${(article as AcademyArticle).difficulty}
Categories: ${(article as AcademyArticle).categories.join(", ")}`
        : ""
}

Example tweets from you:
${this.runtime.character.postExamples.join("\n")}

The tweet should:
1. Start with a clear, concise summary of the key update or development
2. Add your expert analysis or opinion on its significance for BNB Chain
3. Include relevant technical context or educational insights when appropriate
4. Use informal crypto Twitter style for better engagement (e.g., WAGMI, gm, HODL)
5. Structure the tweet with line breaks for better readability:
   - Key update/news
   - Your analysis/opinion
   - Technical context or tips (if relevant)
6. Not exceed ${requestShorter ? "200" : "280"} characters
7. Include relevant crypto symbols if mentioned (e.g. $BNB, $BTC)
8. Do not use any emojis or hashtags
9. Maintain your unique personality traits and style${requestShorter ? "\n10. Make it shorter than the previous attempt" : ""}

Write the tweet text without any surrounding quotes:`;

            const response = await this.textGenService.queueTextCompletion(
                prompt,
                0.7,
                [],
                0,
                0,
                280
            );

            return cleanTweetText(response.trim());
        };

        let tweetText = await generateTweet();

        // If tweet exceeds Twitter's limit, try again with a shorter request
        if (tweetText.length > 280) {
            elizaLogger.info("Tweet too long, generating shorter version...");
            tweetText = await generateTweet(true);
        }

        return tweetText;
    }

    private async checkAndTweetNewBNBChainPost(): Promise<void> {
        try {
            const article = await this.bnbChainScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No BNB Chain article found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    "twitter/last_bnbchain_url"
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("BNB Chain article already tweeted");
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
                    "Successfully tweeted about new BNB Chain article"
                );

                // Cache the processed article URL
                await this.runtime.cacheManager.set(
                    "twitter/last_bnbchain_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewBNBChainPost:", error);
        }
    }

    private async checkAndTweetNewAcademyPost(): Promise<void> {
        try {
            const article = await this.academyScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No Academy article found");
                return;
            }

            // Check if we've already tweeted about this article
            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    "twitter/last_academy_url"
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("Academy article already tweeted");
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
                    "Successfully tweeted about new Academy article"
                );

                // Cache the processed article URL
                await this.runtime.cacheManager.set(
                    "twitter/last_academy_url",
                    article.url,
                    { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewAcademyPost:", error);
        }
    }

    async start() {
        elizaLogger.log("Starting content monitoring...");

        // Check for new content every minute
        setInterval(
            async () => {
                await this.checkAndTweetNewBNBChainPost();
                await this.checkAndTweetNewAcademyPost();
            },
            60 * 1000 // 1 minute
        );

        // Initial checks
        await this.checkAndTweetNewBNBChainPost();
        await this.checkAndTweetNewAcademyPost();
    }
}
