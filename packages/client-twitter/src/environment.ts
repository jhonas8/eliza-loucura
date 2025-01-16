import { parseBooleanFromText, IAgentRuntime } from "@elizaos/core";
import { z, ZodError } from "zod";

export const DEFAULT_MAX_TWEET_LENGTH = 280;

const twitterUsernameSchema = z
    .string()
    .min(1, "An X/Twitter Username must be at least 1 characters long")
    .max(15, "An X/Twitter Username cannot exceed 15 characters")
    .regex(
        /^[A-Za-z0-9_]*$/,
        "An X Username can only contain letters, numbers, and underscores"
    );

/**
 * This schema defines all required/optional environment settings,
 * including new fields like TWITTER_SPACES_ENABLE.
 */
export const twitterEnvSchema = z.object({
    TWITTER_DRY_RUN: z.boolean(),
    TWITTER_API_KEY: z.string().min(1, "Twitter API key is required"),
    TWITTER_API_SECRET: z.string().min(1, "Twitter API secret is required"),
    TWITTER_ACCESS_TOKEN: z.string().min(1, "Twitter access token is required"),
    TWITTER_ACCESS_TOKEN_SECRET: z
        .string()
        .min(1, "Twitter access token secret is required"),
    TWITTER_USERNAME: z.string().min(1, "X/Twitter username is required"),
    MAX_TWEET_LENGTH: z.number().int().default(DEFAULT_MAX_TWEET_LENGTH),
    TWITTER_SEARCH_ENABLE: z.boolean().default(false),
    TWITTER_RETRY_LIMIT: z.number().int(),
    TWITTER_POLL_INTERVAL: z.number().int(),
    TWITTER_TARGET_USERS: z.array(twitterUsernameSchema).default([]),
    POST_INTERVAL_MIN: z.number().int(),
    POST_INTERVAL_MAX: z.number().int(),
    ENABLE_ACTION_PROCESSING: z.boolean(),
    ACTION_INTERVAL: z.number().int(),
    POST_IMMEDIATELY: z.boolean(),
    TWITTER_SPACES_ENABLE: z.boolean().default(false),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

/**
 * Helper to parse a comma-separated list of Twitter usernames
 * (already present in your code).
 */
function parseTargetUsers(targetUsersStr?: string | null): string[] {
    if (!targetUsersStr?.trim()) {
        return [];
    }
    return targetUsersStr
        .split(",")
        .map((user) => user.trim())
        .filter(Boolean);
}

function safeParseInt(
    value: string | undefined | null,
    defaultValue: number
): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
}

/**
 * Validates or constructs a TwitterConfig object using zod,
 * taking values from the IAgentRuntime or process.env as needed.
 */
// This also is organized to serve as a point of documentation for the client
// most of the inputs from the framework (env/character)

// we also do a lot of typing/parsing here
// so we can do it once and only once per character
export async function validateTwitterConfig(
    runtime: IAgentRuntime
): Promise<TwitterConfig> {
    try {
        const twitterConfig = {
            TWITTER_DRY_RUN:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_DRY_RUN") ||
                        process.env.TWITTER_DRY_RUN
                ) ?? false,

            TWITTER_API_KEY:
                runtime.getSetting("TWITTER_API_KEY") ||
                process.env.TWITTER_API_KEY,

            TWITTER_API_SECRET:
                runtime.getSetting("TWITTER_API_SECRET") ||
                process.env.TWITTER_API_SECRET,

            TWITTER_ACCESS_TOKEN:
                runtime.getSetting("TWITTER_ACCESS_TOKEN") ||
                process.env.TWITTER_ACCESS_TOKEN,

            TWITTER_ACCESS_TOKEN_SECRET:
                runtime.getSetting("TWITTER_ACCESS_TOKEN_SECRET") ||
                process.env.TWITTER_ACCESS_TOKEN_SECRET,

            TWITTER_USERNAME:
                runtime.getSetting("TWITTER_USERNAME") ||
                process.env.TWITTER_USERNAME,

            MAX_TWEET_LENGTH: safeParseInt(
                runtime.getSetting("MAX_TWEET_LENGTH") ||
                    process.env.MAX_TWEET_LENGTH,
                DEFAULT_MAX_TWEET_LENGTH
            ),

            TWITTER_SEARCH_ENABLE:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_SEARCH_ENABLE") ||
                        process.env.TWITTER_SEARCH_ENABLE
                ) ?? false,

            TWITTER_RETRY_LIMIT: safeParseInt(
                runtime.getSetting("TWITTER_RETRY_LIMIT") ||
                    process.env.TWITTER_RETRY_LIMIT,
                5
            ),

            TWITTER_POLL_INTERVAL: safeParseInt(
                runtime.getSetting("TWITTER_POLL_INTERVAL") ||
                    process.env.TWITTER_POLL_INTERVAL,
                120
            ),

            TWITTER_TARGET_USERS: parseTargetUsers(
                runtime.getSetting("TWITTER_TARGET_USERS") ||
                    process.env.TWITTER_TARGET_USERS
            ),

            POST_INTERVAL_MIN: safeParseInt(
                runtime.getSetting("POST_INTERVAL_MIN") ||
                    process.env.POST_INTERVAL_MIN,
                90
            ),

            POST_INTERVAL_MAX: safeParseInt(
                runtime.getSetting("POST_INTERVAL_MAX") ||
                    process.env.POST_INTERVAL_MAX,
                180
            ),

            ENABLE_ACTION_PROCESSING:
                parseBooleanFromText(
                    runtime.getSetting("ENABLE_ACTION_PROCESSING") ||
                        process.env.ENABLE_ACTION_PROCESSING
                ) ?? false,

            ACTION_INTERVAL: safeParseInt(
                runtime.getSetting("ACTION_INTERVAL") ||
                    process.env.ACTION_INTERVAL,
                5
            ),

            POST_IMMEDIATELY:
                parseBooleanFromText(
                    runtime.getSetting("POST_IMMEDIATELY") ||
                        process.env.POST_IMMEDIATELY
                ) ?? false,

            TWITTER_SPACES_ENABLE:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_SPACES_ENABLE") ||
                        process.env.TWITTER_SPACES_ENABLE
                ) ?? false,
        };

        return twitterEnvSchema.parse(twitterConfig);
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `X/Twitter configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
