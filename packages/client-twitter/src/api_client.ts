import { elizaLogger } from "@elizaos/core";
import { TwitterApi, TweetV2 } from "twitter-api-v2";
import type { Tweet, TwitterProfile } from "./types";

export class TwitterApiClient {
    private client: TwitterApi;
    private username: string;

    constructor(
        apiKey: string,
        apiSecret: string,
        accessToken: string,
        accessTokenSecret: string,
        username: string
    ) {
        this.client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });
        this.username = username;
    }

    async isLoggedIn(): Promise<boolean> {
        try {
            const user = await this.client.v2.me();
            return (
                user.data.username.toLowerCase() === this.username.toLowerCase()
            );
        } catch (error) {
            elizaLogger.error("Error checking login status:", error);
            return false;
        }
    }

    async getTweet(tweetId: string): Promise<Tweet> {
        try {
            const tweet = await this.client.v2.singleTweet(tweetId, {
                expansions: [
                    "author_id",
                    "referenced_tweets.id",
                    "attachments.media_keys",
                ],
                "tweet.fields": [
                    "created_at",
                    "text",
                    "public_metrics",
                    "entities",
                    "edit_history_tweet_ids",
                ],
                "user.fields": ["name", "username", "profile_image_url"],
            });

            return this.convertTweetV2ToTweet(tweet.data);
        } catch (error) {
            elizaLogger.error("Error fetching tweet:", error);
            throw error;
        }
    }

    async getProfile(username: string): Promise<TwitterProfile> {
        try {
            const user = await this.client.v2.userByUsername(username, {
                "user.fields": ["description", "name", "profile_image_url"],
            });

            return {
                id: user.data.id,
                username: user.data.username,
                screenName: user.data.name,
                bio: user.data.description || "",
            };
        } catch (error) {
            elizaLogger.error("Error fetching profile:", error);
            throw error;
        }
    }

    async postTweet(text: string): Promise<Tweet> {
        try {
            const tweet = await this.client.v2.tweet(text);
            const fullTweet = await this.getTweet(tweet.data.id);
            return fullTweet;
        } catch (error) {
            elizaLogger.error("Error posting tweet:", error);
            throw error;
        }
    }

    async replyToTweet(text: string, replyToTweetId: string): Promise<Tweet> {
        try {
            const tweet = await this.client.v2.reply(text, replyToTweetId);
            const fullTweet = await this.getTweet(tweet.data.id);
            return fullTweet;
        } catch (error) {
            elizaLogger.error("Error replying to tweet:", error);
            throw error;
        }
    }

    async getUserTimeline(
        userId: string,
        limit: number = 100
    ): Promise<Tweet[]> {
        try {
            const timeline = await this.client.v2.userTimeline(userId, {
                max_results: limit,
                expansions: ["referenced_tweets.id", "attachments.media_keys"],
                "tweet.fields": [
                    "created_at",
                    "text",
                    "public_metrics",
                    "entities",
                    "edit_history_tweet_ids",
                ],
            });

            return timeline.data.data.map((tweet) =>
                this.convertTweetV2ToTweet(tweet)
            );
        } catch (error) {
            elizaLogger.error("Error fetching user timeline:", error);
            throw error;
        }
    }

    async getMentions(sinceId?: string): Promise<Tweet[]> {
        try {
            const userId = await this.getUserId();
            const mentions = await this.client.v2.userMentionTimeline(userId, {
                since_id: sinceId,
                expansions: ["referenced_tweets.id", "attachments.media_keys"],
                "tweet.fields": [
                    "created_at",
                    "text",
                    "public_metrics",
                    "entities",
                    "edit_history_tweet_ids",
                ],
            });

            return mentions.data.data.map((tweet) =>
                this.convertTweetV2ToTweet(tweet)
            );
        } catch (error) {
            elizaLogger.error("Error fetching mentions:", error);
            throw error;
        }
    }

    private async getUserId(): Promise<string> {
        const user = await this.client.v2.userByUsername(this.username);
        return user.data.id;
    }

    private convertTweetV2ToTweet(tweetV2: TweetV2): Tweet {
        return {
            id: tweetV2.id,
            text: tweetV2.text,
            userId: tweetV2.author_id,
            createdAt: tweetV2.created_at,
            metrics: tweetV2.public_metrics,
            entities: tweetV2.entities,
        };
    }
}
