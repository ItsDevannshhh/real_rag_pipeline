import { readFile } from "node:fs/promises";

export interface Subtitle {
    index: number;
    startTime: string;
    endTime: string;
    text: string;
}

export async function parseSrt(
    filePath: string
): Promise<Subtitle[]> {
    const content = await readFile(filePath, "utf-8");

    const blocks = content
        .replace(/\r\n/g, "\n")
        .trim()
        .split(/\n\s*\n/);

    const subtitles: Subtitle[] = [];

    for (const block of blocks) {
        const lines = block
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        // We need at least:
        // line 0 → subtitle index
        // line 1 → timestamp
        // line 2+ → subtitle text
        if (lines.length < 3) {
            continue;
        }

        const indexLine = lines[0];

        if (!indexLine) {
            continue;
        }

        const index = Number(indexLine);

        if (Number.isNaN(index)) {
            continue;
        }

        const timestampLine = lines[1];

        if (!timestampLine) {
            continue;
        }

        const timestamp = timestampLine.match(
            /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/
        );

        if (!timestamp) {
            continue;
        }

        const startTime = timestamp[1];
        const endTime = timestamp[2];

        if (!startTime || !endTime) {
            continue;
        }

        const text = lines.slice(2).join(" ");

        if (!text) {
            continue;
        }

        subtitles.push({
            index,
            startTime,
            endTime,
            text,
        });
    }

    return subtitles;
}