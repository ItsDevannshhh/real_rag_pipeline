import { ai } from "../db/ai";
import type { VectorSearchResult } from "./vector-search";

const RERANK_MODEL = "gpt-4o-mini";

export interface RerankedResult extends VectorSearchResult {
    relevanceScore: number;
}

export async function rerankResults(
    query: string,
    results: VectorSearchResult[],
    topK = 5
): Promise<RerankedResult[]> {
    if (results.length === 0) {
        return [];
    }

    const candidates = results.map((result, index) => ({
        id: index,
        text: result.text,
    }));

    const response = await ai.chat.completions.create({
        model: RERANK_MODEL,
        temperature: 0,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: `
You are a document relevance reranker.

Given a user's question and a list of retrieved document chunks,
assign each chunk a relevance score from 0 to 10.

10 = directly answers the question
7-9 = highly relevant
4-6 = somewhat relevant
1-3 = weakly relevant
0 = irrelevant

Return ONLY valid JSON in this format:

{
  "results": [
    {
      "id": 0,
      "score": 10
    }
  ]
}
        `.trim(),
            },
            {
                role: "user",
                content: JSON.stringify({
                    query,
                    candidates,
                }),
            },
        ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Reranker did not return a response");
    }

    const parsed = JSON.parse(content) as {
        results: {
            id: number;
            score: number;
        }[];
    };

    return parsed.results
        .filter(
            (item) =>
                Number.isInteger(item.id) &&
                item.id >= 0 &&
                item.id < results.length &&
                typeof item.score === "number"
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((item) => ({
            ...results[item.id]!,
            relevanceScore: item.score,
        }));
}