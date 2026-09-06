import { enhanceQuery } from "./query-enhancer";

const queries = [
    "What is React Native?",
    "How does Expo work?",
    "What is the difference between React Native and Expo?",
];

for (const query of queries) {
    const enhancedQuery = await enhanceQuery(query);

    console.log("\nOriginal:");
    console.log(query);

    console.log("\nEnhanced:");
    console.log(enhancedQuery);

    console.log("-----------------------------------");
}