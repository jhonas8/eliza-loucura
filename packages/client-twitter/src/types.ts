export interface Tweet {
    id: string;
    text: string;
    userId?: string;
    createdAt?: string;
    metrics?: {
        retweet_count?: number;
        reply_count?: number;
        like_count?: number;
        quote_count?: number;
    };
    entities?: {
        mentions?: Array<{
            start: number;
            end: number;
            username: string;
            id: string;
        }>;
        hashtags?: Array<{
            start: number;
            end: number;
            tag: string;
        }>;
        urls?: Array<{
            start: number;
            end: number;
            url: string;
            expanded_url: string;
            display_url: string;
        }>;
    };
}

export interface TwitterProfile {
    id: string;
    username: string;
    screenName: string;
    bio: string;
    nicknames?: string[];
}
