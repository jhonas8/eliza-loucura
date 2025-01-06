import { BinanceScraperAction } from "./actions/binance_scraper";
import { IAgentRuntime, ModelProviderName, Character } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

async function test() {
    // Create a mock runtime
    const mockCharacter: Character = {
        name: "Test Agent",
        modelProvider: ModelProviderName.OPENAI,
        settings: {
            secrets: {
                TWITTER_API_KEY: process.env.TWITTER_API_KEY,
                TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
                TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
                TWITTER_ACCESS_TOKEN_SECRET:
                    process.env.TWITTER_ACCESS_TOKEN_SECRET,
            },
        },
        bio: "Test agent for scraping Binance announcements",
        lore: ["A test agent that scrapes Binance announcements"],
        messageExamples: [],
        postExamples: [],
        knowledge: [],
        topics: [],
        style: {
            all: [],
            chat: [],
            post: [],
        },
        adjectives: ["helpful", "efficient"],
        clients: ["twitter"],
        plugins: [],
    };

    const mockRuntime: Partial<IAgentRuntime> = {
        agentId:
            uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
        serverUrl: "http://localhost:3000",
        modelProvider: ModelProviderName.OPENAI,
        imageModelProvider: ModelProviderName.OPENAI,
        character: mockCharacter,
        providers: [],
        actions: [],
        evaluators: [],
        plugins: [],
    };

    const scraper = new BinanceScraperAction(
        {
            maxPosts: 1,
            template:
                "🚀 {{title}} \n\nRead more: {{url}} \n\n#Akita #Binance #Crypto 🐕",
        },
        mockRuntime as IAgentRuntime
    );

    console.log("Running scraper test...");
    await scraper.execute();
}

test().catch(console.error);
