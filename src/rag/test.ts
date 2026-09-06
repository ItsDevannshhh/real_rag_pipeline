import { validateReadOnlySql } from "./utils/sql-validator";

const safeQueries = [
    `
    SELECT COUNT(*)
    FROM Lecture
    JOIN Module
      ON Lecture.moduleId = Module.id
    WHERE Module.name = 'module 3';
  `,

    `
    SELECT lectureId, COUNT(*)
    FROM Chunk
    GROUP BY lectureId;
  `,

    `
    WITH lecture_counts AS (
      SELECT lectureId, COUNT(*) AS count
      FROM Chunk
      GROUP BY lectureId
    )
    SELECT *
    FROM lecture_counts;
  `,
];

const unsafeQueries = [
    `DELETE FROM Chunk;`,

    `UPDATE Lecture
   SET name = 'hacked';`,

    `DROP TABLE Lecture;`,

    `SELECT * FROM Users;`,

    `SELECT * FROM Lecture; DELETE FROM Chunk;`,
];

console.log("\n========== SAFE QUERIES ==========\n");

for (const sql of safeQueries) {
    try {
        validateReadOnlySql(sql);
        console.log("✓ SAFE");
        console.log(sql.trim());
    } catch (error) {
        console.log("✗ REJECTED");
        console.log(error);
    }

    console.log("-----------------------------------");
}

console.log("\n========== UNSAFE QUERIES ==========\n");

for (const sql of unsafeQueries) {
    try {
        validateReadOnlySql(sql);
        console.log("✗ SHOULD HAVE BEEN REJECTED");
        console.log(sql.trim());
    } catch (error) {
        console.log("✓ REJECTED");
        console.log((error as Error).message);
    }

    console.log("-----------------------------------");
}