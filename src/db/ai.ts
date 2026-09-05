import OpenAI from "openai";

const apiKey = process.env.AI_API_KEY!;
const baseURL = process.env.AI_API_BASE_URL!;

export const ai = new OpenAI({
    apiKey,
    baseURL,
});