import { executeReadOnlySql } from "./utils/sql-executor";

const queries = [
  `
    SELECT COUNT(*) AS lecture_count
    FROM "Lecture" l
    JOIN "Module" m
      ON l."moduleId" = m."id"
    WHERE m."name" = 'module 3'
  `,

  `
    SELECT
      m."name" AS module_name,
      COUNT(l."id") AS lecture_count
    FROM "Module" m
    LEFT JOIN "Lecture" l
      ON l."moduleId" = m."id"
    GROUP BY m."id", m."name"
    ORDER BY m."name"
  `,
];

for (const sql of queries) {
  console.log("\nSQL:");
  console.log(sql.trim());

  try {
    const result = await executeReadOnlySql(sql);

    console.log("\nResult:");
    console.log(result);
  } catch (error) {
    console.error("\nExecution failed:");
    console.error(error);
  }

  console.log("-----------------------------------");
}