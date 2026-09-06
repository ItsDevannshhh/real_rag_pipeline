import type { RetrievedEvidence } from "../retrieval";
import type { AnswerSource } from "../final-answer";

export function resolveSources(
    evidence: RetrievedEvidence[],
    sourceIds: string[]
): AnswerSource[] {
    const sources: AnswerSource[] = [];

    for (const result of evidence) {
        if (result.route !== "VECTOR") {
            continue;
        }

        if (!Array.isArray(result.data)) {
            continue;
        }

        for (const item of result.data) {
            if (
                typeof item !== "object" ||
                item === null
            ) {
                continue;
            }

            const candidate = item as {
                chunkId?: unknown;
                moduleName?: unknown;
                lectureName?: unknown;
                fileName?: unknown;
                startTime?: unknown;
                endTime?: unknown;
            };

            if (
                typeof candidate.chunkId !== "string" ||
                !sourceIds.includes(candidate.chunkId)
            ) {
                continue;
            }

            if (
                typeof candidate.moduleName !== "string" ||
                typeof candidate.lectureName !== "string" ||
                typeof candidate.fileName !== "string" ||
                typeof candidate.startTime !== "string" ||
                typeof candidate.endTime !== "string"
            ) {
                continue;
            }

            sources.push({
                module: candidate.moduleName,
                lecture: candidate.lectureName,
                file: candidate.fileName,
                startTime: candidate.startTime,
                endTime: candidate.endTime,
            });
        }
    }

    return sources;
}