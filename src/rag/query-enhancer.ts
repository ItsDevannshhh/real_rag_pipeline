import { ai } from "../db/ai";

const LLM_MODEL = "gpt-4o-mini";

export async function enhanceQuery(
    query: string
): Promise<string> {
    const response = await ai.chat.completions.create({
        model: LLM_MODEL,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: `
You are a search query enhancement assistant.

Your job is to rewrite the user's question into a clearer,
more descriptive search query for retrieving relevant
information from a course transcript.

Rules:
- Preserve the exact intent of the user's question.
- Add only concepts that are clearly implied by the question.
- Include important terms, entities, and concepts that improve retrieval.
- Do not introduce new comparison criteria or topics that the user did not ask about.
- Do not answer the question.
- Do not invent facts.
- Return ONLY the enhanced search query.
`.trim(),
            },
            {
                role: "user",
                content: query,
            },
        ],
    });

    const enhancedQuery =
        response.choices[0]?.message?.content?.trim();

    if (!enhancedQuery) {
        throw new Error("Query enhancement failed");
    }

    return enhancedQuery;
}