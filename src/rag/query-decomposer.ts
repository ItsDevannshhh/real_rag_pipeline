import { ai } from "../db/ai";

const LLM_MODEL = "gpt-4o-mini";

export async function decomposeQuery(
    query: string
): Promise<string[]> {
    const response = await ai.chat.completions.create({
        model: LLM_MODEL,
        temperature: 0,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: `
You are a query decomposition assistant for a RAG system.

Your job is to determine whether the user's question contains
multiple distinct information needs.

Rules:
- If the question asks for only one piece of information,
  return one query containing the original intent.
- If the question contains multiple distinct information needs,
  split it into separate, self-contained queries.
- Each query must be understandable on its own.
- Preserve the user's original intent.
- Do not answer the questions.
- Do not invent new topics.
- Keep the queries concise.
- Return ONLY valid JSON in this format:

{
  "queries": [
    "query 1",
    "query 2"
  ]
}
        `.trim(),
            },
            {
                role: "user",
                content: query,
            },
        ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Query decomposition failed");
    }

    const parsed = JSON.parse(content) as {
        queries?: unknown;
    };

    if (!Array.isArray(parsed.queries)) {
        throw new Error(
            "Query decomposition returned an invalid format"
        );
    }

    const queries = parsed.queries.filter(
        (item): item is string =>
            typeof item === "string" && item.trim().length > 0
    );

    if (queries.length === 0) {
        throw new Error("No queries were generated");
    }

    return queries;
}