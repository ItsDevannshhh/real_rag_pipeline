import { routeQuery } from "./query-router";

const queries = [
    "What is React Native?",
    "How does Expo work?",
    "What are the advantages of React Native?",
    "How many lectures are in module 3?",
    "List all lectures in module 5.",
    "How many chunks are stored for each lecture?",
];

for (const query of queries) {
    const route = await routeQuery(query);

    console.log("\nQuery:");
    console.log(query);

    console.log(`Route: ${route}`);

    console.log("-----------------------------------");
}