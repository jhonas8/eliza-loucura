import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    UUID,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { postActionResponseFooter } from "@elizaos/core";
import { generateTweetActions } from "@elizaos/core";
import { IImageDescriptionService, ServiceType } from "@elizaos/core";
import { buildConversationThread } from "./utils.ts";
import { twitterMessageHandlerTemplate } from "./interactions.ts";
import { DEFAULT_MAX_TWEET_LENGTH } from "./environment.ts";
import { BinanceEnhancedScraper } from "./binance-scraper.ts";

const twitterPostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
Write a post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
Your response should be 1, 2, or 3 sentences (choose the length at random).
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than {{maxTweetLength}}. No emojis. Use \\n\\n (double spaces) between statements if there are multiple statements in your response.`;

export const twitterActionTemplate =
    `
# INSTRUCTIONS: Determine actions for {{agentName}} (@{{twitterUserName}}) based on:
{{bio}}
{{postDirections}}

Guidelines:
- ONLY engage with content that DIRECTLY relates to character's core interests
- Direct mentions are priority IF they are on-topic
- Skip ALL content that is:
  - Off-topic or tangentially related
  - From high-profile accounts unless explicitly relevant
  - Generic/viral content without specific relevance
  - Political/controversial unless central to character
  - Promotional/marketing unless directly relevant

Actions (respond only with tags):
[LIKE] - Perfect topic match AND aligns with character (9.8/10)
[RETWEET] - Exceptional content that embodies character's expertise (9.5/10)
[QUOTE] - Can add substantial domain expertise (9.5/10)
[REPLY] - Can contribute meaningful, expert-level insight (9.5/10)

Tweet:
{{currentTweet}}

# Respond with qualifying action tags only. Default to NO action unless extremely confident of relevance.` +
    postActionResponseFooter;

/**
 * Truncate text to fit within the Twitter character limit, ensuring it ends at a complete sentence.
 */
function truncateToCompleteSentence(
    text: string,
    maxTweetLength: number
): string {
    if (text.length <= maxTweetLength) {
        return text;
    }

    // Attempt to truncate at the last period within the limit
    const lastPeriodIndex = text.lastIndexOf(".", maxTweetLength - 1);
    if (lastPeriodIndex !== -1) {
        const truncatedAtPeriod = text.slice(0, lastPeriodIndex + 1).trim();
        if (truncatedAtPeriod.length > 0) {
            return truncatedAtPeriod;
        }
    }

    // If no period, truncate to the nearest whitespace within the limit
    const lastSpaceIndex = text.lastIndexOf(" ", maxTweetLength - 1);
    if (lastSpaceIndex !== -1) {
        const truncatedAtSpace = text.slice(0, lastSpaceIndex).trim();
        if (truncatedAtSpace.length > 0) {
            return truncatedAtSpace + "...";
        }
    }

    // Fallback: Hard truncate and add ellipsis
    const hardTruncated = text.slice(0, maxTweetLength - 3).trim();
    return hardTruncated + "...";
}

export class TwitterPostClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    twitterUsername: string;
    private isProcessing: boolean = false;
    private lastProcessTime: number = 0;
    private stopProcessingActions: boolean = false;
    private isDryRun: boolean;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.twitterUsername = this.client.twitterConfig.TWITTER_USERNAME;
        this.isDryRun = this.client.twitterConfig.TWITTER_DRY_RUN;

        // Log configuration on initialization
        elizaLogger.log("Twitter Client Configuration:");
        elizaLogger.log(`- Username: ${this.twitterUsername}`);
        elizaLogger.log(
            `- Dry Run Mode: ${this.isDryRun ? "enabled" : "disabled"}`
        );
        elizaLogger.log(
            `- Post Interval: ${this.client.twitterConfig.POST_INTERVAL_MIN}-${this.client.twitterConfig.POST_INTERVAL_MAX} minutes`
        );
        elizaLogger.log(
            `- Action Processing: ${this.client.twitterConfig.ENABLE_ACTION_PROCESSING ? "enabled" : "disabled"}`
        );
        elizaLogger.log(
            `- Action Interval: ${this.client.twitterConfig.ACTION_INTERVAL} minutes`
        );
        elizaLogger.log(
            `- Post Immediately: ${this.client.twitterConfig.POST_IMMEDIATELY ? "enabled" : "disabled"}`
        );
        elizaLogger.log(
            `- Search Enabled: ${this.client.twitterConfig.TWITTER_SEARCH_ENABLE ? "enabled" : "disabled"}`
        );

        const targetUsers = this.client.twitterConfig.TWITTER_TARGET_USERS;
        if (targetUsers) {
            elizaLogger.log(`- Target Users: ${targetUsers}`);
        }

        if (this.isDryRun) {
            elizaLogger.log(
                "Twitter client initialized in dry run mode - no actual tweets should be posted"
            );
        }
    }

    async start() {
        if (!this.client.profile) {
            await this.client.init();
        }

        const generateNewTweetLoop = async () => {
            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>("twitter/" + this.twitterUsername + "/lastPost");

            const lastPostTimestamp = lastPost?.timestamp ?? 0;
            const minMinutes = this.client.twitterConfig.POST_INTERVAL_MIN;
            const maxMinutes = this.client.twitterConfig.POST_INTERVAL_MAX;
            const randomMinutes =
                Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) +
                minMinutes;
            const delay = randomMinutes * 60 * 1000;

            if (Date.now() > lastPostTimestamp + delay) {
                await this.generateNewTweet();
            }

            setTimeout(() => {
                generateNewTweetLoop(); // Set up next iteration
            }, delay);

            elizaLogger.log(`Next tweet scheduled in ${randomMinutes} minutes`);
        };

        const processActionsLoop = async () => {
            const actionInterval = this.client.twitterConfig.ACTION_INTERVAL; // Defaults to 5 minutes

            while (!this.stopProcessingActions) {
                try {
                    const results = await this.processTweetActions();
                    if (results) {
                        elizaLogger.log(`Processed ${results.length} tweets`);
                        elizaLogger.log(
                            `Next action processing scheduled in ${actionInterval} minutes`
                        );
                        // Wait for the full interval before next processing
                        await new Promise(
                            (resolve) =>
                                setTimeout(resolve, actionInterval * 60 * 1000) // now in minutes
                        );
                    }
                } catch (error) {
                    elizaLogger.error(
                        "Error in action processing loop:",
                        error
                    );
                    // Add exponential backoff on error
                    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30s on error
                }
            }
        };

        if (this.client.twitterConfig.POST_IMMEDIATELY) {
            await this.generateNewTweet();
        }

        // Only start tweet generation loop if not in dry run mode
        if (!this.isDryRun) {
            generateNewTweetLoop();
            elizaLogger.log("Tweet generation loop started");
        } else {
            elizaLogger.log("Tweet generation loop disabled (dry run mode)");
        }

        if (
            this.client.twitterConfig.ENABLE_ACTION_PROCESSING &&
            !this.isDryRun
        ) {
            processActionsLoop().catch((error) => {
                elizaLogger.error(
                    "Fatal error in process actions loop:",
                    error
                );
            });
        } else {
            if (this.isDryRun) {
                elizaLogger.log(
                    "Action processing loop disabled (dry run mode)"
                );
            } else {
                elizaLogger.log(
                    "Action processing loop disabled by configuration"
                );
            }
        }
    }

    private async generateNewTweet() {
        elizaLogger.log("Generating new tweet");

        try {
            // Randomly choose between personality-based tweet and Binance article tweet
            const shouldUseBinance = Math.random() < 0.5;

            if (shouldUseBinance) {
                return await this.generateBinanceArticleTweet();
            }

            const roomId = stringToUuid(
                "twitter_generate_room-" + this.client.profile.username
            );
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.client.profile.username,
                this.runtime.character.name,
                "twitter"
            );

            const topics = this.runtime.character.topics.join(", ");

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: topics || "",
                        action: "TWEET",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                }
            );

            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.twitterPostTemplate ||
                    twitterPostTemplate,
            });

            elizaLogger.debug("generate post prompt:\n" + context);

            const newTweetContent = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            await this.processTweetContent(newTweetContent);
        } catch (error) {
            elizaLogger.error("Error generating new tweet:", error);
        }
    }

    private async generateBinanceArticleTweet() {
        try {
            const scraper = new BinanceEnhancedScraper();
            const article = await scraper.getLatestArticle();

            if (!article) {
                elizaLogger.warn(
                    "No article found, falling back to personality-based tweet"
                );
                return this.generateNewTweet();
            }

            // Check if we've already processed this article
            const lastProcessedArticle = await this.runtime.cacheManager.get<{
                url: string;
                timestamp: number;
            }>("twitter/" + this.twitterUsername + "/lastProcessedArticle");

            if (
                lastProcessedArticle &&
                lastProcessedArticle.url === article.url
            ) {
                elizaLogger.info(
                    "Article already processed, falling back to personality-based tweet"
                );
                return this.generateNewTweet();
            }

            elizaLogger.info(`Got latest Binance article: ${article.title}`);
            elizaLogger.debug(`Article URL: ${article.url}`);
            elizaLogger.debug(
                `Article content length: ${article.content.length} chars`
            );

            const roomId = stringToUuid(
                "twitter_generate_room-binance-" + this.client.profile.username
            );

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: `Article Title: ${article.title}\n\nArticle Content: ${article.content}`,
                        action: "TWEET_FROM_ARTICLE",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                }
            );

            const context = composeContext({
                state,
                template: `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{providers}}

# Task: Generate a tweet about the following Binance article in the voice and style of {{agentName}}:
Article Title: ${article.title}
Article Content: ${article.content}

Write a tweet that summarizes the key points and adds your expert perspective. Do not add commentary or acknowledge this request, just write the tweet.
Your response should be 1-2 sentences. The total character count MUST be less than 240 characters to leave room for the URL.
No emojis. Use \\n\\n (double spaces) between statements if there are multiple statements.`,
            });

            elizaLogger.debug("generate article tweet prompt:\n" + context);

            const newTweetContent = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            // Process the tweet content and append the article URL
            const cleanedContent =
                await this.processTweetContent(newTweetContent);
            if (cleanedContent) {
                // Store the article as processed before posting
                await this.runtime.cacheManager.set(
                    `twitter/${this.twitterUsername}/lastProcessedArticle`,
                    {
                        url: article.url,
                        timestamp: Date.now(),
                    }
                );

                return this.processTweetContent(
                    `${cleanedContent}\n\n${article.url}`
                );
            }
        } catch (error) {
            elizaLogger.error("Error generating Binance article tweet:", error);
            // Fallback to personality-based tweet
            return this.generateNewTweet();
        }
    }

    private async processTweetContent(newTweetContent: string) {
        // First attempt to clean content
        let cleanedContent = "";

        // Try parsing as JSON first
        try {
            const parsedResponse = JSON.parse(newTweetContent);
            if (parsedResponse.text) {
                cleanedContent = parsedResponse.text;
            } else if (typeof parsedResponse === "string") {
                cleanedContent = parsedResponse;
            }
        } catch (error) {
            error.linted = true; // make linter happy since catch needs a variable
            // If not JSON, clean the raw content
            cleanedContent = newTweetContent
                .replace(/^\s*{?\s*"text":\s*"|"\s*}?\s*$/g, "") // Remove JSON-like wrapper
                .replace(/^['"](.*)['"]$/g, "$1") // Remove quotes
                .replace(/\\"/g, '"') // Unescape quotes
                .replace(/\\n/g, "\n\n") // Unescape newlines, ensures double spaces
                .trim();
        }

        if (!cleanedContent) {
            elizaLogger.error(
                "Failed to extract valid content from response:",
                {
                    rawResponse: newTweetContent,
                    attempted: "JSON parsing",
                }
            );
            return null;
        }

        // Truncate the content to the maximum tweet length specified in the environment settings
        const maxTweetLength = this.client.twitterConfig.MAX_TWEET_LENGTH;
        if (maxTweetLength) {
            cleanedContent = truncateToCompleteSentence(
                cleanedContent,
                maxTweetLength
            );
        }

        const removeQuotes = (str: string) =>
            str.replace(/^['"](.*)['"]$/, "$1");

        const fixNewLines = (str: string) => str.replaceAll(/\\n/g, "\n\n"); //ensures double spaces

        // Final cleaning
        cleanedContent = removeQuotes(fixNewLines(cleanedContent));

        if (this.isDryRun) {
            elizaLogger.info(
                `Dry run: would have posted tweet: ${cleanedContent}`
            );
            return null;
        }

        try {
            elizaLogger.log(`Posting new tweet:\n ${cleanedContent}`);
            const result =
                await this.client.twitterClient.sendTweet(cleanedContent);
            elizaLogger.info("Successfully posted tweet");

            // Cache the last post details
            await this.runtime.cacheManager.set(
                `twitter/${this.client.profile.username}/lastPost`,
                {
                    timestamp: Date.now(),
                }
            );

            return cleanedContent;
        } catch (error) {
            elizaLogger.error("Error sending tweet:", error);
            return null;
        }
    }

    async stop() {
        this.stopProcessingActions = true;
    }
}
