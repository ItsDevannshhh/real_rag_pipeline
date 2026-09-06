import { searchVectors } from "./vector-search";
import { rerankResults } from "./reranker";

const query = "What is React Native?";

const candidates = await searchVectors(query, 10);

console.log(`Retrieved ${candidates.length} candidates`);

const results = await rerankResults(
    query,
    candidates,
    5
);

console.log("\n========== RERANKED RESULTS ==========\n");

for (const [index, result] of results.entries()) {
    console.log(`Result ${index + 1}`);
    console.log(`Rerank Score : ${result.relevanceScore}`);
    console.log(`Vector Score : ${result.score}`);
    console.log(`Module       : ${result.moduleName}`);
    console.log(`Lecture      : ${result.lectureName}`);
    console.log(`Timestamp    : ${result.startTime} → ${result.endTime}`);
    console.log(`Text         : ${result.text}`);
    console.log("--------------------------------------");
}