import { ai } from "../db/ai";

const LLM_MODEL = "gpt-4o-mini";

export interface AnswerSource {
    module: string;
    lecture: string;
    file: string;
    startTime: string;
    endTime: string;
}

export interface FinalAnswer {
    answer: string;
    sourceIds: string[];
}

export async function generateFinalAnswer(
    userQuery: string,
    evidence: unknown,
    previousFeedback?: string
): Promise<FinalAnswer> {

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
You are the final answer generator for a RAG system.

Your job is to answer the user's question using ONLY the
retrieved evidence provided to you.

Rules:

1. Answer EVERY distinct information need in the user's question.

2. If the question contains multiple parts, make sure your
   answer addresses every part.

3. Use ALL relevant retrieved evidence, including both:
   - VECTOR evidence
   - SQL evidence

4. SQL results are authoritative for structured questions such as:
   - counts
   - lists
   - filtering
   - grouping
   - metadata

5. Do not ignore relevant SQL results just because there is
   also vector evidence.

6. Do not use outside knowledge.

7. Do not invent facts.

8. Do not make claims that are not supported by the evidence.

9. Give a concise, direct answer.

10. For transcript/vector evidence, identify which retrieved
    chunks actually support the answer.

11. Use the exact chunkId of supporting vector chunks.

12. Do not create or modify timestamps.

13. Do not create or modify lecture names, module names, or files.

14. Do not expose internal implementation details such as
    VECTOR, SQL, Qdrant, PostgreSQL, or reranking.

15. If previous evaluator feedback is provided, use it to
    improve the answer.

16. Do not blindly follow evaluator feedback if it conflicts
    with the retrieved evidence.

17. Return ONLY valid JSON.

Before generating the answer, internally check:

- What are all the distinct information needs in the question?
- Does the evidence contain information for each one?
- Does my answer address every one?
- Did I fix the issue mentioned in the previous feedback?

Response format:

{
  "answer": "The complete answer to the user's question.",
  "sourceIds": [
    "chunk-id-that-supports-the-answer"
  ]
}

Source rules:

- sourceIds must contain ONLY chunkIds that appear in the
  retrieved vector evidence.
- Include only chunks that actually support the answer.
- Do not include unrelated chunks.
- Do not invent chunkIds.
- SQL-only information does not require a sourceId.
- If no transcript/vector evidence is needed, return an empty
  sourceIds array.
        `.trim(),
            },
            {
                role: "user",
                content: JSON.stringify({
                    question: userQuery,
                    evidence,
                    previousFeedback:
                        previousFeedback ??
                        "No previous attempt. Generate the answer normally.",
                }),
            },
        ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Final answer generation failed");
    }

    const parsed = JSON.parse(content) as Partial<FinalAnswer>;

    if (typeof parsed.answer !== "string") {
        throw new Error("Final answer has an invalid answer field");
    }

    if (!Array.isArray(parsed.sourceIds)) {
        throw new Error("Final answer has an invalid sourceIds field");
    }

    const sourceIds = parsed.sourceIds.filter(
        (id): id is string =>
            typeof id === "string" && id.trim().length > 0
    );

    return {
        answer: parsed.answer,
        sourceIds,
    };
}