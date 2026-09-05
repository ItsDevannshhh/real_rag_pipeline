import { createHash } from "node:crypto";

import { prisma } from "../db/prisma";
import { qdrant } from "../db/qdrant";
import { createEmbedding } from "./embeddings";

const COLLECTION_NAME = "course_chunks";

function chunkIdToUuid(chunkId: string): string {
    const hash = createHash("sha256")
        .update(chunkId)
        .digest("hex");

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        hash.slice(12, 16),
        hash.slice(16, 20),
        hash.slice(20, 32),
    ].join("-");
}

async function ensureCollection() {
    const collections = await qdrant.getCollections();

    const exists = collections.collections.some(
        (collection) => collection.name === COLLECTION_NAME
    );

    if (exists) {
        return;
    }

    await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
            size: 1536,
            distance: "Cosine",
        },
    });

    console.log(
        `Created Qdrant collection: ${COLLECTION_NAME}`
    );
}

async function main() {
    await ensureCollection();

    const chunks = await prisma.chunk.findMany({
        include: {
            lecture: {
                include: {
                    module: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    console.log(
        `Found ${chunks.length} chunks in PostgreSQL\n`
    );

    let successful = 0;
    let failed = 0;

    for (const [index, chunk] of chunks.entries()) {
        console.log(
            `[${index + 1}/${chunks.length}] ` +
            `${chunk.lecture.module.name} / ` +
            `${chunk.lecture.name} / ` +
            `${chunk.startTime}`
        );

        try {
            const vector = await createEmbedding(chunk.text);

            const pointId = chunkIdToUuid(chunk.id);

            await qdrant.upsert(COLLECTION_NAME, {
                wait: true,
                points: [
                    {
                        id: pointId,
                        vector,
                        payload: {
                            chunkId: chunk.id,
                            text: chunk.text,
                            moduleName: chunk.lecture.module.name,
                            lectureName: chunk.lecture.name,
                            fileName: chunk.lecture.fileName,
                            startTime: chunk.startTime,
                            endTime: chunk.endTime,
                        },
                    },
                ],
            });

            successful++;

            console.log(
                `  ✓ Embedded and inserted (${vector.length} dimensions)`
            );
        } catch (error) {
            failed++;

            console.error(
                `  ✗ Failed chunk: ${chunk.id}`
            );

            console.error(error);
        }
    }

    console.log("\n========== COMPLETE ==========");
    console.log(`Total      : ${chunks.length}`);
    console.log(`Successful : ${successful}`);
    console.log(`Failed     : ${failed}`);
}

await main();