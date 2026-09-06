import type { AnswerSource } from "../final-answer";

function timeToMilliseconds(time: string): number {
    const [hours, minutes, rest] = time.split(":");

    if (!hours || !minutes || !rest) {
        throw new Error(`Invalid timestamp: ${time}`);
    }

    const [seconds, milliseconds] = rest.split(",");

    if (!seconds || !milliseconds) {
        throw new Error(`Invalid timestamp: ${time}`);
    }

    return (
        Number(hours) * 60 * 60 * 1000 +
        Number(minutes) * 60 * 1000 +
        Number(seconds) * 1000 +
        Number(milliseconds)
    );
}

function rangesOverlap(
    first: AnswerSource,
    second: AnswerSource
): boolean {
    const firstStart = timeToMilliseconds(first.startTime);
    const firstEnd = timeToMilliseconds(first.endTime);

    const secondStart = timeToMilliseconds(second.startTime);
    const secondEnd = timeToMilliseconds(second.endTime);

    return (
        firstStart <= secondEnd &&
        secondStart <= firstEnd
    );
}

export function deduplicateSources(
    sources: AnswerSource[]
): AnswerSource[] {
    const result: AnswerSource[] = [];

    for (const source of sources) {
        const duplicate = result.some(
            (existing) =>
                existing.module === source.module &&
                existing.lecture === source.lecture &&
                existing.file === source.file &&
                rangesOverlap(existing, source)
        );

        if (!duplicate) {
            result.push(source);
        }
    }

    return result;
}