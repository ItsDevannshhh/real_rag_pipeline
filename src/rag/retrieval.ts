import { routeQuery } from "./query-router";
import { searchVectors } from "./vector-search";
import { rerankResults } from "./reranker";
import { generateSql } from "./utils/text-to-sql";
import { executeReadOnlySql } from "./utils/sql-executor";

export interface RetrievedEvidence {
    query: string;
    route: "VECTOR" | "SQL";
    data: unknown;
}

export async function retrieveForQueries(
    queries: string[]
): Promise<RetrievedEvidence[]> {
    const results: RetrievedEvidence[] = [];

    for (const query of queries) {
        console.log(`\nProcessing query: ${query}`);

        const route = await routeQuery(query);

        console.log(`Route: ${route}`);

        if (route === "VECTOR") {
            const candidates = await searchVectors(query, 10);

            const reranked = await rerankResults(
                query,
                candidates,
                5
            );

            results.push({
                query,
                route,
                data: reranked,
            });

            continue;
        }

        const sql = await generateSql(query);

        console.log(`Generated SQL:\n${sql}`);

        const sqlResult = await executeReadOnlySql(sql);

        results.push({
            query,
            route,
            data: sqlResult,
        });
    }

    return results;
}