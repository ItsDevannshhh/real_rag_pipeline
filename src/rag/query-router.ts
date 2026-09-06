import { ai } from "../db/ai";

const LLM_MODEL = "gpt-4o-mini";

export type QueryRoute = "VECTOR" | "SQL";

export interface RoutedQuery {
    query: string;
    route: QueryRoute;
}

export async function routeQuery(
    query: string
): Promise<QueryRoute> {
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
You are a query router for a RAG system.

Your job is to decide whether a user query should be
answered using:

VECTOR:
Use this when the query requires semantic understanding
or searching the course transcript content.

SQL:
Use this when the query requires structured data operations
such as counting, filtering, listing, grouping, or retrieving
specific metadata from the database.

Database entities include:
- Course
- Module
- Lecture
- Chunk

Examples:

"What is React Native?"
→ VECTOR

"How does Expo work?"
→ VECTOR

"What are the advantages of React Native?"
→ VECTOR

"How many lectures are in module 3?"
→ SQL

"List all lectures in module 5."
→ SQL

"Which lectures are in module 2?"
→ SQL

"How many chunks are stored for each lecture?"
→ SQL

Rules:
- Return exactly one route.
- Return only valid JSON.
- Do not answer the query.

Format:

{
  "route": "VECTOR"
}

or

{
  "route": "SQL"
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
        throw new Error("Query routing failed");
    }

    const parsed = JSON.parse(content) as {
        route?: unknown;
    };

    if (
        parsed.route !== "VECTOR" &&
        parsed.route !== "SQL"
    ) {
        throw new Error(
            `Invalid query route: ${String(parsed.route)}`
        );
    }

    return parsed.route;
}