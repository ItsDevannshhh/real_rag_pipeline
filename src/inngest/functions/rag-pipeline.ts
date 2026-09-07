import { inngest } from "../client";

import { checkInputGuardrail } from "../../rag/input-guardrail";
import { enhanceQuery } from "../../rag/query-enhancer";
import { decomposeQuery } from "../../rag/query-decomposer";
import { retrieveForQueries } from "../../rag/retrieval";
import { generateFinalAnswer } from "../../rag/final-answer";
import { evaluateAnswer } from "../../rag/evaluator";
import { checkOutputGuardrail } from "../../rag/output-guardrail";

import { resolveSources } from "../../rag/utils/source-resolver";
import { deduplicateSources } from "../../rag/utils/source-deduplicator";

export const ragPipeline = inngest.createFunction(
    {
        id: "rag-pipeline",
        triggers: {
            event: "rag/query.requested",
        },
    },

    async ({ event, step }) => {
        const userQuery = event.data.query;

        // 0. Input guardrail
        const inputGuardrail = await step.run(
            "input-guardrail",
            async () => {
                return checkInputGuardrail(userQuery);
            }
        );

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
        const enhancedQuery = await step.run(
            "enhance-query",
            async () => {
                return enhanceQuery(userQuery);
            }
        );

        // 2. Decompose query
        const queries = await step.run(
            "decompose-query",
            async () => {
                return decomposeQuery(enhancedQuery);
            }
        );

        // 3. Retrieve evidence
        const evidence = await step.run(
            "retrieve-evidence",
            async () => {
                return retrieveForQueries(queries);
            }
        );

        let bestResult: {
            answer: string;
            sources: ReturnType<typeof deduplicateSources>;
            evaluation: Awaited<ReturnType<typeof evaluateAnswer>>;
        } | null = null;

        let previousFeedback: string | undefined;

        // 4. Generate + evaluate
        // Maximum 3 attempts
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(
                `\n========== RAG ATTEMPT ${attempt} ==========`
            );

            // 4a. Generate answer
            const generatedAnswer = await step.run(
                `generate-answer-${attempt}`,
                async () => {
                    return generateFinalAnswer(
                        userQuery,
                        evidence,
                        previousFeedback
                    );
                }
            );

            // 4b. Resolve exact source metadata
            const sources = await step.run(
                `resolve-sources-${attempt}`,
                async () => {
                    return deduplicateSources(
                        resolveSources(
                            evidence,
                            generatedAnswer.sourceIds
                        )
                    );
                }
            );

            // 4c. Evaluate answer
            const evaluation = await step.run(
                `evaluate-answer-${attempt}`,
                async () => {
                    return evaluateAnswer(
                        userQuery,
                        generatedAnswer.answer,
                        evidence
                    );
                }
            );

            const currentResult = {
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

                const outputGuardrail = await step.run(
                    `output-guardrail-${attempt}`,
                    async () => {
                        return checkOutputGuardrail(
                            generatedAnswer.answer
                        );
                    }
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
            // Give evaluator feedback to the next attempt.
            previousFeedback = evaluation.feedback;

            console.log(
                `Evaluation failed: ${evaluation.feedback}`
            );

            console.log("Retrying...");
        }

        // All 3 attempts failed
        console.log(
            "Maximum attempts reached. Returning final result."
        );

        return bestResult;
    }
);