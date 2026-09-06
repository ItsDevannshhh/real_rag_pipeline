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

interface SourceCandidate {
    chunkId: string;
    moduleName: string;
    lectureName: string;
    fileName: string;
    startTime: string;
    endTime: string;
    text: string;
}

export async function generateFinalAnswer(
    userQuery: string,
    evidence: unknown
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
- Do not use outside knowledge.
- Do not invent facts.
- Do not make claims that are not supported by the evidence.
- Give a concise, direct answer.
- For transcript/vector evidence, identify which retrieved
  chunks actually support the answer.
- Use the exact chunkId of supporting chunks.
- Do not create or modify timestamps.
- Do not create or modify lecture names, module names, or files.
- SQL results can be used directly for structured information.
- Do not expose internal implementation details such as
  VECTOR, SQL, Qdrant, PostgreSQL, or reranking.
- Return ONLY valid JSON.

Response format:

{
  "answer": "The answer to the user's question.",
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