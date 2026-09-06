const ALLOWED_TABLES = new Set([
    "course",
    "module",
    "lecture",
    "chunk",
]);

const FORBIDDEN_KEYWORDS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "MERGE",
    "CALL",
];

function extractCteNames(sql: string): Set<string> {
    const cteNames = new Set<string>();

    const withMatch = sql.match(
        /^\s*WITH\s+([\s\S]+?)\bSELECT\b/i
    );

    if (!withMatch?.[1]) {
        return cteNames;
    }

    const ctePattern =
        /(?:^|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi;

    for (const match of withMatch[1].matchAll(ctePattern)) {
        const name = match[1]?.toLowerCase();

        if (name) {
            cteNames.add(name);
        }
    }

    return cteNames;
}

export function validateReadOnlySql(
    sql: string
): void {
    const normalized = sql
        .trim()
        .replace(/;+\s*$/, "");

    if (!normalized) {
        throw new Error("SQL query is empty");
    }

    // Reject multiple statements.
    if (normalized.includes(";")) {
        throw new Error(
            "Multiple SQL statements are not allowed"
        );
    }

    const upperSql = normalized.toUpperCase();

    // Must begin with SELECT or WITH.
    if (
        !upperSql.startsWith("SELECT ") &&
        !upperSql.startsWith("SELECT\n") &&
        !upperSql.startsWith("WITH ")
    ) {
        throw new Error(
            "Only SELECT queries are allowed"
        );
    }

    // Reject write/destructive operations.
    for (const keyword of FORBIDDEN_KEYWORDS) {
        const pattern = new RegExp(
            `\\b${keyword}\\b`,
            "i"
        );

        if (pattern.test(normalized)) {
            throw new Error(
                `Forbidden SQL operation: ${keyword}`
            );
        }
    }

    // CTE names are temporary query-scoped names,
    // not actual database tables.
    const cteNames = extractCteNames(normalized);

    // Validate tables referenced by FROM/JOIN.
    const tableMatches = normalized.matchAll(
        /\b(?:FROM|JOIN)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi
    );

    for (const match of tableMatches) {
        const tableName = match[1]?.toLowerCase();

        if (!tableName) {
            continue;
        }

        // Allow references to CTEs.
        if (cteNames.has(tableName)) {
            continue;
        }

        if (!ALLOWED_TABLES.has(tableName)) {
            throw new Error(
                `Table is not allowed: ${tableName}`
            );
        }
    }
}