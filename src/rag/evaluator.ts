import { ai } from "../db/ai";

const LLM_MODEL = "gpt-4o-mini";

export interface EvaluationResult {
    score: number;
    passed: boolean;
    feedback: string;
}

export async function evaluateAnswer(
    userQuery: string,
    answer: string,
    evidence: unknown
): Promise<EvaluationResult> {
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
You are an evaluator for a RAG question-answering system.

Evaluate the generated answer using ONLY:
1. The user's question.
2. The retrieved evidence.
3. The generated answer.

Evaluate these criteria:

1. Correctness
   - Does the answer correctly answer the user's question?
   - Are the claims supported by the retrieved evidence?

2. Completeness
   - Does the answer address all parts of the user's question?

3. Groundedness
   - Does the answer avoid unsupported or invented information?

4. Source correctness
   - If transcript evidence is used, are the selected sources
     relevant to the answer?

Scoring:

9-10 = Excellent
7-8  = Good
6    = Acceptable
4-5  = Weak
2-3  = Very poor
0-1  = Completely incorrect

Rules:
- Give exactly one score from 0 to 10.
- Be strict about unsupported claims.
- Do not use outside knowledge.
- Do not rewrite the answer.
- Do not answer the user's question.
- Return ONLY valid JSON.

Response format:

{
  "score": 8,
  "passed": true,
  "feedback": "Brief explanation of the evaluation."
}

The answer passes when score >= 6.
        `.trim(),
            },
            {
                role: "user",
                content: JSON.stringify({
                    question: userQuery,
                    answer,
                    evidence,
                }),
            },
        ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Evaluator did not return a response");
    }

    const parsed = JSON.parse(content) as {
        score?: unknown;
        passed?: unknown;
        feedback?: unknown;
    };

    if (
        typeof parsed.score !== "number" ||
        parsed.score < 0 ||
        parsed.score > 10
    ) {
        throw new Error("Evaluator returned an invalid score");
    }

    if (typeof parsed.feedback !== "string") {
        throw new Error("Evaluator returned invalid feedback");
    }

    const score = parsed.score;

    return {
        score,
        passed: score >= 6,
        feedback: parsed.feedback,
    };
}