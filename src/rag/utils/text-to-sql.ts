import { ai } from "../../db/ai";
import { prisma } from "../../db/prisma";

const LLM_MODEL = "gpt-4o-mini";

const DATABASE_SCHEMA = `
Table: Course
Columns:
- id
- name
- createdAt

Table: Module
Columns:
- id
- name
- courseId
- createdAt

Table: Lecture
Columns:
- id
- name
- fileName
- moduleId
- createdAt

Table: Chunk
Columns:
- id
- text
- startTime
- endTime
- lectureId
- createdAt

Relationships:
- Module.courseId → Course.id
- Lecture.moduleId → Module.id
- Chunk.lectureId → Lecture.id
`;

async function getModuleNames(): Promise<string[]> {
    const modules = await prisma.module.findMany({
        select: {
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    return modules.map((module) => module.name);
}

export async function generateSql(
    query: string
): Promise<string> {
    const moduleNames = await getModuleNames();

    const response = await ai.chat.completions.create({
        model: LLM_MODEL,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: `
You are a PostgreSQL Text-to-SQL generator for a RAG system.

Database schema:

${DATABASE_SCHEMA}

Actual module names in the database:

${moduleNames.map((name) => `- ${name}`).join("\n")}

Rules:
- Generate ONLY a SELECT query.
- You may use JOIN, WHERE, GROUP BY, ORDER BY, HAVING,
  aggregate functions, and CTEs when necessary.
- Only use the tables and columns provided in the schema.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE,
  TRUNCATE, GRANT, REVOKE, or other data-modifying statements.
- Never generate multiple SQL statements.
- Do not include markdown fences.
- Do not explain the query.
- Return ONLY the SQL query.

Important semantic rules:
- The actual module names listed above are stored in "Module"."name".
- Module IDs are strings (CUIDs), not integers.
- Never assume a module name maps to a numeric ID.
- When the user refers to a module, match against "Module"."name".
- Preserve the exact module name when possible.

PostgreSQL identifier rules:
- Prisma created these tables with quoted, case-sensitive names:
  "Course", "Module", "Lecture", "Chunk".
- ALWAYS use double quotes around table names.
- ALWAYS use double quotes around column names.
- Never use unquoted table or column names.

Example:

SELECT COUNT(*)
FROM "Lecture" l
JOIN "Module" m
  ON l."moduleId" = m."id"
WHERE m."name" = 'module 3';
`.trim(),
            },
            {
                role: "user",
                content: query,
            },
        ],
    });

    const sql = response.choices[0]?.message?.content?.trim();

    if (!sql) {
        throw new Error("Text-to-SQL generation failed");
    }

    return sql;
}