import { decomposeQuery } from "./query-decomposer";
import { enhanceQuery } from "./query-enhancer";
import { retrieveForQueries } from "./retrieval";

const userQuery =
  "What is React Native and how many lectures are in module 3?";

const enhancedQuery = await enhanceQuery(userQuery);

console.log("\n========== ORIGINAL QUERY ==========");
console.log(userQuery);

console.log("\n========== ENHANCED QUERY ==========");
console.log(enhancedQuery);

const queries = await decomposeQuery(enhancedQuery);

console.log("\n========== DECOMPOSED QUERIES ==========");

queries.forEach((query, index) => {
  console.log(`${index + 1}. ${query}`);
});

const results = await retrieveForQueries(queries);

console.log("\n========== RETRIEVAL RESULTS ==========\n");

for (const result of results) {
  console.log(`Query : ${result.query}`);
  console.log(`Route : ${result.route}`);
  console.log("Data  :");
  console.dir(result.data, {
    depth: null,
  });
  console.log("-----------------------------------");
}