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
import { BNBChainScraper, BNBChainArticle } from "./scrapers/bnbChain";
import { OpenAIService } from "../../plugin-node/src/services/openai";

export class TwitterPostClient {
    private binanceScraper: BinanceScraper;
    private binanceSquareScraper: BinanceSquareScraper;
    private bnbChainScraper: BNBChainScraper;
    private textGenService: ITextGenerationService;
    private isProcessing: boolean = false;
    private readonly cacheKeys = {
        binanceAnnouncement: "twitter/last_binance_announcement_url",
        binanceNews: "twitter/last_binance_news_url",
        bnbChain: "twitter/last_bnbchain_url",
    };

    constructor(
        private client: ClientBase,
        private runtime: IAgentRuntime
    ) {
        this.binanceScraper = new BinanceScraper();
        this.binanceSquareScraper = new BinanceSquareScraper();
        this.bnbChainScraper = new BNBChainScraper();

        // Initialize OpenAI service
        this.textGenService = new OpenAIService();
        this.textGenService.initialize(this.runtime);
        this.runtime.registerService(this.textGenService);
    }

    private async clearCache(): Promise<void> {
        elizaLogger.info("Clearing tweet cache on startup...");
        try {
            await Promise.all([
                this.runtime.cacheManager.delete(
                    this.cacheKeys.binanceAnnouncement
                ),
                this.runtime.cacheManager.delete(this.cacheKeys.binanceNews),
                this.runtime.cacheManager.delete(this.cacheKeys.bnbChain),
            ]);
            elizaLogger.info("Tweet cache cleared successfully");
        } catch (error) {
            elizaLogger.error("Error clearing tweet cache:", error);
        }
    }

    private async generateTweetFromArticle(
        article: BinanceArticle | BinanceSquareArticle | BNBChainArticle,
        isNews: boolean = false
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

    private async tryPostTweet(
        tweetText: string,
        cacheKey: string,
        articleUrl: string
    ): Promise<boolean> {
        try {
            if (this.client.twitterConfig.TWITTER_DRY_RUN) {
                elizaLogger.info("Dry run mode - would tweet:", tweetText);
                return true;
            }

            await this.client.twitterClient.sendTweet(tweetText);

            // Only cache after successful tweet
            await this.runtime.cacheManager.set(
                cacheKey,
                articleUrl,
                { expires: Date.now() + 24 * 60 * 60 * 1000 } // 24 hours
            );

            return true;
        } catch (error) {
            elizaLogger.error(`Error posting tweet: ${error}`);
            return false;
        }
    }

    private async checkAndTweetNewAnnouncement(): Promise<void> {
        try {
            const article = await this.binanceScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No announcement found");
                return;
            }

            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    this.cacheKeys.binanceAnnouncement
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("Announcement already tweeted");
                return;
            }

            const tweetText = await this.generateTweetFromArticle(
                article,
                false
            );
            const success = await this.tryPostTweet(
                tweetText,
                this.cacheKeys.binanceAnnouncement,
                article.url
            );

            if (success) {
                elizaLogger.info(
                    "Successfully tweeted about new Binance announcement"
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

            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    this.cacheKeys.binanceNews
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("News article already tweeted");
                return;
            }

            const tweetText = await this.generateTweetFromArticle(
                article,
                true
            );
            const success = await this.tryPostTweet(
                tweetText,
                this.cacheKeys.binanceNews,
                article.url
            );

            if (success) {
                elizaLogger.info(
                    "Successfully tweeted about new Binance news article"
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewNews:", error);
        }
    }

    private async checkAndTweetNewBNBChainPost(): Promise<void> {
        try {
            const article = await this.bnbChainScraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn("No BNB Chain article found");
                return;
            }

            const lastProcessedUrl =
                await this.runtime.cacheManager.get<string>(
                    this.cacheKeys.bnbChain
                );

            if (lastProcessedUrl === article.url) {
                elizaLogger.info("BNB Chain article already tweeted");
                return;
            }

            const tweetText = await this.generateTweetFromArticle(
                article,
                true
            );
            const success = await this.tryPostTweet(
                tweetText,
                this.cacheKeys.bnbChain,
                article.url
            );

            if (success) {
                elizaLogger.info(
                    "Successfully tweeted about new BNB Chain article"
                );
            }
        } catch (error) {
            elizaLogger.error("Error in checkAndTweetNewBNBChainPost:", error);
        }
    }

    private async processAllSources(): Promise<void> {
        if (this.isProcessing) {
            elizaLogger.warn("Already processing sources, skipping this cycle");
            return;
        }

        this.isProcessing = true;
        try {
            // Process sources sequentially
            elizaLogger.info("Checking Binance announcements...");
            await this.checkAndTweetNewAnnouncement();

            elizaLogger.info("Checking Binance news...");
            await this.checkAndTweetNewNews();

            elizaLogger.info("Checking BNB Chain posts...");
            await this.checkAndTweetNewBNBChainPost();
        } catch (error) {
            elizaLogger.error("Error in processAllSources:", error);
        } finally {
            this.isProcessing = false;
        }
    }

    async start() {
        elizaLogger.log("Starting content monitoring...");

        // Clear cache on startup
        await this.clearCache();

        // Initial check
        await this.processAllSources();

        // Check for new content every minute
        setInterval(
            () => this.processAllSources(),
            60 * 1000 // 1 minute
        );
    }
}
