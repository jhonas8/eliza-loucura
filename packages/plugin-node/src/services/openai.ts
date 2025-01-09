import OpenAI from "openai";
import {
    IAgentRuntime,
    ITextGenerationService,
    ServiceType,
    Service,
} from "@elizaos/core";

export class OpenAIService extends Service implements ITextGenerationService {
    private openai: OpenAI | null = null;
    private runtime: IAgentRuntime | null = null;
    static serviceType: ServiceType = ServiceType.TEXT_GENERATION;

    async initializeModel(): Promise<void> {
        // No initialization needed for OpenAI
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error(
                "OpenAI API key not found in environment variables"
            );
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }

    async queueMessageCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<any> {
        if (!this.openai) {
            throw new Error("OpenAI service not initialized");
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: context }],
                temperature: temperature,
                max_tokens: max_tokens,
                presence_penalty: presence_penalty,
                frequency_penalty: frequency_penalty,
            });

            if (!response.choices[0].message?.content) {
                throw new Error("No response from OpenAI");
            }

            return response.choices[0].message.content;
        } catch (error) {
            console.error("Error calling OpenAI API:", error);
            throw error;
        }
    }

    async queueTextCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<string> {
        return this.queueMessageCompletion(
            context,
            temperature,
            stop,
            frequency_penalty,
            presence_penalty,
            max_tokens
        );
    }

    async getEmbeddingResponse(input: string): Promise<number[] | undefined> {
        if (!this.openai) {
            throw new Error("OpenAI service not initialized");
        }

        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: input,
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error("Error getting embedding:", error);
            return undefined;
        }
    }
}
