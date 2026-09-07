import { checkInputGuardrail } from "./input-guardrail";
import { enhanceQuery } from "./query-enhancer";
import { decomposeQuery } from "./query-decomposer";
import { retrieveForQueries } from "./retrieval";
import { generateFinalAnswer } from "./final-answer";
import { evaluateAnswer } from "./evaluator";

import { checkOutputGuardrail } from "./output-guardrail";
import { resolveSources } from "./utils/source-resolver";
import { deduplicateSources } from "./utils/source-deduplicator";

export interface RagResult {
    answer: string;
    sources: ReturnType<typeof deduplicateSources>;
    evaluation: Awaited<ReturnType<typeof evaluateAnswer>> | null;
    blocked?: boolean;
    reason?: string;
}

export async function runRag(
    userQuery: string
): Promise<RagResult> {

    // 0. Input guardrail

    const inputGuardrail =
        await checkInputGuardrail(userQuery);

    if (!inputGuardrail.allowed) {
        return {
            answer: "I can't help with that request.",
            sources: [],
            evaluation: null,
            blocked: true,
            reason: inputGuardrail.reason,
        };
    }

    // 1. Enhance query

    const enhancedQuery =
        await enhanceQuery(userQuery);

    // 2. Decompose query

    const queries =
        await decomposeQuery(enhancedQuery);

    // 3. Retrieve evidence

    const evidence =
        await retrieveForQueries(queries);

    let bestResult: RagResult | null = null;

    let previousFeedback: string | undefined;

    // 4. Generate + evaluate
    // Maximum 3 attempts

    for (let attempt = 1; attempt <= 3; attempt++) {

        console.log(
            `\n========== RAG ATTEMPT ${attempt} ==========`
        );

        // 4a. Generate answer

        const generatedAnswer =
            await generateFinalAnswer(
                userQuery,
                evidence,
                previousFeedback
            );

        // 4b. Resolve sources

        const sources =
            deduplicateSources(
                resolveSources(
                    evidence,
                    generatedAnswer.sourceIds
                )
            );

        // 4c. Evaluate answer

        const evaluation =
            await evaluateAnswer(
                userQuery,
                generatedAnswer.answer,
                evidence
            );

        const currentResult: RagResult = {
            answer: generatedAnswer.answer,
            sources,
            evaluation,
        };

        bestResult = currentResult;

        console.log(
            `Attempt ${attempt} score: ${evaluation.score}`
        );

        // Answer is good enough

        if (evaluation.score >= 6) {

            console.log("Evaluation passed.");

            // 5. Output guardrail

            const outputGuardrail =
                await checkOutputGuardrail(
                    generatedAnswer.answer
                );

            if (!outputGuardrail.allowed) {

                console.log(
                    `Output guardrail blocked the answer: ${outputGuardrail.reason}`
                );

                return {
                    answer: outputGuardrail.safeAnswer,
                    sources: [],
                    evaluation,
                    blocked: true,
                    reason: outputGuardrail.reason,
                };
            }

            return currentResult;
        }

        // Answer failed.
        // Give evaluator feedback to next attempt.

        previousFeedback =
            evaluation.feedback;

        console.log(
            `Evaluation failed: ${evaluation.feedback}`
        );

        console.log("Retrying...");
    }

    // All attempts failed

    console.log(
        "Maximum attempts reached. Returning final result."
    );

    return bestResult!;
}