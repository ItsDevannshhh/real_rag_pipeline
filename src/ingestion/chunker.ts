import type { Subtitle } from "./parser";

export interface Chunk {
    text: string;
    startTime: string;
    endTime: string;
}

interface ChunkOptions {
    maxCharacters?: number;
    overlapCharacters?: number;
}

export function chunkSubtitles(
    subtitles: Subtitle[],
    options: ChunkOptions = {}
): Chunk[] {
    const maxCharacters = options.maxCharacters ?? 1500;
    const overlapCharacters = options.overlapCharacters ?? 200;

    const chunks: Chunk[] = [];

    let currentSubtitles: Subtitle[] = [];
    let currentLength = 0;

    for (const subtitle of subtitles) {
        const subtitleLength = subtitle.text.length;

        if (
            currentSubtitles.length > 0 &&
            currentLength + subtitleLength > maxCharacters
        ) {
            const first = currentSubtitles[0];
            const last = currentSubtitles[currentSubtitles.length - 1];

            if (!first || !last) {
                continue;
            }

            chunks.push({
                text: currentSubtitles
                    .map((item) => item.text)
                    .join(" "),
                startTime: first.startTime,
                endTime: last.endTime,
            });

            const overlapSubtitles: Subtitle[] = [];
            let overlapLength = 0;

            for (let i = currentSubtitles.length - 1; i >= 0; i--) {
                const item = currentSubtitles[i];

                if (!item) {
                    continue;
                }

                if (overlapLength + item.text.length > overlapCharacters) {
                    break;
                }

                overlapSubtitles.unshift(item);
                overlapLength += item.text.length;
            }

            currentSubtitles = overlapSubtitles;
            currentLength = overlapLength;
        }

        currentSubtitles.push(subtitle);
        currentLength += subtitleLength;
    }

    if (currentSubtitles.length > 0) {
        const first = currentSubtitles[0];
        const last = currentSubtitles[currentSubtitles.length - 1];

        if (first && last) {
            chunks.push({
                text: currentSubtitles
                    .map((item) => item.text)
                    .join(" "),
                startTime: first.startTime,
                endTime: last.endTime,
            });
        }
    }

    return chunks;
}