import { prisma } from "../../db/prisma";
import { validateReadOnlySql } from "./sql-validator";

function normalizeBigInt(value: unknown): unknown {
    if (typeof value === "bigint") {
        return Number(value);
    }

    if (Array.isArray(value)) {
        return value.map(normalizeBigInt);
    }

    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, value]) => [
                key,
                normalizeBigInt(value),
            ])
        );
    }

    return value;
}

export async function executeReadOnlySql(
    sql: string
): Promise<unknown[]> {
    validateReadOnlySql(sql);

    const result = await prisma.$queryRawUnsafe<unknown[]>(sql);

    return normalizeBigInt(result) as unknown[];
}