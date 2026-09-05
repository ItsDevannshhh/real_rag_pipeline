import { qdrant } from "../db/qdrant";
import { createEmbedding } from "../ingestion/embeddings";

const COLLECTION_NAME = "course_chunks";

export interface VectorSearchResult {
    score: number;
    chunkId: string;
    text: string;
    moduleName: string;
    lectureName: string;
    fileName: string;
    startTime: string;
    endTime: string;
}

export async function searchVectors(
    query: string,
    limit = 5
): Promise<VectorSearchResult[]> {
    const queryVector = await createEmbedding(query);

    const results = await qdrant.query(COLLECTION_NAME, {
        query: queryVector,
        limit,
        with_payload: true,
    });

    return results.points.map((point) => {
        const payload = point.payload ?? {};

        return {
            score: point.score ?? 0,
            chunkId: String(payload.chunkId ?? ""),
            text: String(payload.text ?? ""),
            moduleName: String(payload.moduleName ?? ""),
            lectureName: String(payload.lectureName ?? ""),
            fileName: String(payload.fileName ?? ""),
            startTime: String(payload.startTime ?? ""),
            endTime: String(payload.endTime ?? ""),
        };
    });
}