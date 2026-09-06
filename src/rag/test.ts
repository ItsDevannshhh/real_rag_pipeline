import { decomposeQuery } from "./query-decomposer";

const queries = [
    "What is React Native?",

    "What is React Native and what is Expo?",

    "What is the difference between React Native and Expo, and when should I use each?",

    "How does React Native work and what are its advantages and limitations?",
];

for (const query of queries) {
    const decomposed = await decomposeQuery(query);

    console.log("\nOriginal:");
    console.log(query);

    console.log("\nDecomposed:");
    decomposed.forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
    });

    console.log("-----------------------------------");
}