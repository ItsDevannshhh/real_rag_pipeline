import "dotenv/config";

import { ai } from "../db/ai";
import { runRag } from "./run-rag";

const LLM_MODEL = "gpt-4o-mini";

const userQuery =
    "tell me about the projects of this course and how many lectures are in this course";

const main = async () => {
    // Run the complete RAG pipeline
    const ragResult = await runRag(userQuery);

    if (ragResult.blocked) {
        console.log(ragResult.answer);
        return;
    }

    // Final LLM turns the RAG result into a natural answer
    const response = await ai.chat.completions.create({
        model: LLM_MODEL,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: `
You are the final response generator for a course
question-answering system.

The RAG system has already processed the user's question
and produced an answer with supporting course sources.

Your job is to produce the final response that will be
shown directly to the student.

Rules:

- Answer the user's question naturally and clearly.
- Use the RAG result as your source of truth.
- Do not use outside knowledge.
- Do not invent information.
- Preserve the meaning of the RAG answer.
- Explain the answer in your own natural words.
- When the RAG result contains relevant course sources,
  naturally tell the student where the information was
  discussed.
- Mention the module, lecture, and timestamp when relevant with the proper starting and ending time
- Use the source timestamps exactly as provided.
- Never invent or modify timestamps.
- Never invent lecture or module names.
- If multiple sources support different parts of the answer,
  mention the relevant locations naturally.
- Do not return JSON.
- Do not use a rigid response template.
- Do not mention internal implementation details such as
  Qdrant, PostgreSQL, embeddings, reranking, or RAG.
- Return only the natural-language answer.

The goal is to answer the student's question while also
helping them locate the relevant discussion in the course.
                `.trim(),
            },
            {
                role: "user",
                content: JSON.stringify({
                    question: userQuery,
                    ragResult,
                }),
            },
        ],
    });

    const finalAnswer =
        response.choices[0]?.message?.content;

    if (!finalAnswer) {
        throw new Error(
            "Final LLM did not return an answer"
        );
    }

    console.log(
        "\n========== FINAL ANSWER ==========\n"
    );

    console.log(finalAnswer);
};

await main();