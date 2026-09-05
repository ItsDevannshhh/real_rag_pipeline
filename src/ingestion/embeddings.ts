import { ai } from "../db/ai";

const EMBEDDING_MODEL = "text-embedding-3-small";

export async function createEmbedding(
    text: string
): Promise<number[]> {
    const response = await ai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
        throw new Error("Embedding was not returned");
    }

    return embedding;
}