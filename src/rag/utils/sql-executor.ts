import { prisma } from "../../db/prisma";
import { validateReadOnlySql } from "./sql-validator";

export async function executeReadOnlySql(
    sql: string
): Promise<unknown[]> {
    // Security boundary:
    // Never execute SQL before validation.
    validateReadOnlySql(sql);

    const result = await prisma.$queryRawUnsafe<unknown[]>(
        sql
    );

    return result;
}