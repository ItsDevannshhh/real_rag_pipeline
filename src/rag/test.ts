import { searchVectors } from "./vector-search";

const query = "What is React Native?";

const results = await searchVectors(query, 5);

console.log("\n========== SEARCH RESULTS ==========\n");

for (const [index, result] of results.entries()) {
    console.log(`Result ${index + 1}`);
    console.log(`Score     : ${result.score}`);
    console.log(`Module    : ${result.moduleName}`);
    console.log(`Lecture   : ${result.lectureName}`);
    console.log(`File      : ${result.fileName}`);
    console.log(`Timestamp : ${result.startTime} → ${result.endTime}`);
    console.log(`Text      : ${result.text}`);
    console.log("-----------------------------------");
}