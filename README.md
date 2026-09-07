# Advanced RAG Course Assistant

An advanced Retrieval-Augmented Generation (RAG) system that answers questions from course lecture transcripts using hybrid retrieval, LLM-based query processing, evaluation, retries, safety guardrails, and Inngest workflow orchestration.

The project is built from individual RAG components rather than relying on an end-to-end framework such as LangChain.

---

## ✨ Features

- Course transcript ingestion from `.srt` files
- PostgreSQL for structured course data
- Qdrant for semantic vector search
- LLM-powered query enhancement
- Multi-query decomposition
- Intelligent query routing
- Hybrid retrieval:
  - Vector search + reranking
  - Text-to-SQL
- Parallel retrieval for decomposed queries
- LLM-based answer generation
- LLM-based answer evaluation
- Automatic retry for low-quality answers
- Input guardrails
- Output guardrails
- Lecture/module/timestamp references in final responses
- Inngest-based workflow orchestration
- Express backend
- Direct OpenAI SDK usage
- No LangChain

---

## 🏗️ Architecture

```text
                         User Query
                              │
                              ▼
                     ┌─────────────────┐
                     │ Input Guardrail │
                     └────────┬────────┘
                              │
                              ▼
                     Query Enhancement
                              │
                              ▼
                    Query Decomposition
                              │
                              ▼
                 ┌─────────────────────────┐
                 │   Parallel Retrieval    │
                 └────────────┬────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              Vector Route          SQL Route
                    │                   │
                    ▼                   ▼
               Qdrant Search       Text-to-SQL
                    │                   │
                    ▼                   ▼
                Reranking          SQL Validation
                                        │
                                        ▼
                                  SQL Execution
                    │                   │
                    └─────────┬─────────┘
                              ▼
                     Answer Generation
                              │
                              ▼
                         Evaluator
                              │
                    ┌─────────┴─────────┐
                    │                   │
                  < 6                  >= 6
                    │                   │
                    ▼                   ▼
                  Retry          Output Guardrail
                  ≤ 3 times             │
                                        ▼
                              Final Response LLM
                                        │
                                        ▼
                              Answer + Timestamps
```

---

## 🔄 RAG Pipeline

### 1. Input Guardrail

The query first passes through a safety layer using deterministic pattern matching followed by LLM-based classification.

It blocks requests involving sensitive information, prompt injection, harmful requests, credentials, secrets, and other restricted content.

### 2. Query Enhancement

The original query is rewritten by an LLM to improve retrieval quality while preserving the original intent.

### 3. Query Decomposition

Complex queries are split into independent subqueries.

Example:

```text
"What is React Native and how many lectures are in module 3?"
```

can become:

```text
1. What is React Native?
2. How many lectures are in module 3?
```

### 4. Query Routing

Each decomposed query is routed to the appropriate retrieval system.

**VECTOR** is used for semantic questions about lecture content.

**SQL** is used for structured questions such as:

- Counts
- Lists
- Filtering
- Grouping
- Course/module/lecture metadata

### 5. Vector Retrieval

Course chunks are embedded using:

```text
text-embedding-3-small
```

and stored in Qdrant.

The system retrieves candidate chunks and uses an LLM-based reranker to select the most relevant evidence.

### 6. Text-to-SQL

For structured queries, an LLM generates SQL based on the database schema.

Generated SQL is validated before execution.

Only read-only queries against the allowed course tables are permitted.

### 7. Parallel Retrieval

When a query is decomposed into multiple subqueries, retrieval operations run concurrently.

```ts
await Promise.all(
  queries.map((query) => retrieveSingleQuery(query))
);
```

### 8. Answer Generation

The retrieved evidence is passed to an LLM which generates an answer using only the available evidence.

Both vector and SQL results can contribute to the answer.

### 9. Answer Evaluation

A separate evaluator LLM evaluates the generated answer on:

- Correctness
- Completeness
- Groundedness
- Source correctness

The score ranges from `0` to `10`.

```text
Score >= 6 → Pass
Score < 6  → Retry
```

### 10. Retry Mechanism

If the evaluator gives a score below `6`, its feedback is passed into the next generation attempt.

Maximum attempts:

```text
3
```

### 11. Output Guardrail

Before returning a successful answer, the generated response passes through an output safety layer.

This protects against accidentally exposing:

- API keys
- Passwords
- Credentials
- Tokens
- Private keys
- Environment variables
- Confidential system information
- Unsafe content

### 12. Final Response

A final LLM converts the validated RAG result into a natural-language response.

The response can also tell the user where the information was discussed in the course.

Example:

```text
React Native is a framework that allows developers to build
mobile applications using JavaScript and React.

This is discussed in Module 1, lecture
"02_react-native-vs-expo_epm", from 00:00:00 to 00:02:00.
```

---

## 🗃️ Data Architecture

Course data is organized hierarchically:

```text
Course
 └── Module
      └── Lecture
           └── Chunk
```

### PostgreSQL

PostgreSQL stores the structured course hierarchy and transcript chunks.

Each chunk contains:

```text
text
startTime
endTime
lectureId
```

### Qdrant

Qdrant stores vector embeddings together with source metadata:

```text
chunkId
text
moduleName
lectureName
fileName
startTime
endTime
```

This allows retrieved evidence to retain its original course location.

---

## 📁 Project Structure

```text
real_rag_tutorial/
│
├── src/
│   │
│   ├── db/
│   │   ├── ai.ts
│   │   ├── prisma.ts
│   │   └── qdrant.ts
│   │
│   ├── ingestion/
│   │   ├── srt-reader.ts
│   │   ├── parser.ts
│   │   ├── chunker.ts
│   │   ├── database.ts
│   │   ├── embeddings.ts
│   │   ├── ingest-all.ts
│   │   └── ingest-vectors.ts
│   │
│   ├── rag/
│   │   ├── input-guardrail.ts
│   │   ├── output-guardrail.ts
│   │   ├── query-enhancer.ts
│   │   ├── query-decomposer.ts
│   │   ├── query-router.ts
│   │   ├── retrieval.ts
│   │   ├── vector-search.ts
│   │   ├── reranker.ts
│   │   ├── final-answer.ts
│   │   ├── evaluator.ts
│   │   ├── run-rag.ts
│   │   ├── test.ts
│   │   │
│   │   └── utils/
│   │       ├── text-to-sql.ts
│   │       ├── sql-validator.ts
│   │       ├── sql-executor.ts
│   │       ├── source-resolver.ts
│   │       └── source-deduplicator.ts
│   │
│   ├── inngest/
│   │   ├── client.ts
│   │   ├── events.ts
│   │   └── functions/
│   │       ├── index.ts
│   │       └── rag-pipeline.ts
│   │
│   └── index.ts
│
├── prisma/
│   └── schema.prisma
│
├── prisma.config.ts
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript | Application development |
| Bun | Runtime & package manager |
| Express | Backend API |
| PostgreSQL | Structured data storage |
| Prisma | Database ORM |
| Qdrant | Vector database |
| Inngest | Workflow orchestration |
| OpenAI SDK | LLM & embedding API |
| `gpt-4o-mini` | LLM operations |
| `text-embedding-3-small` | Text embeddings |
| SRT | Course transcript format |

---

## 🚀 Getting Started

### Prerequisites

- Bun
- Docker
- PostgreSQL
- Qdrant
- An OpenAI-compatible API provider

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd real_rag_tutorial
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

```text
PostgreSQL → localhost:5432
Qdrant     → localhost:6333
```

### 4. Configure environment variables

Create `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rag_db"

QDRANT_URL="http://localhost:6333"

AI_API_KEY="your-api-key"
AI_API_BASE_URL="your-openai-compatible-base-url"

INNGEST_DEV=1
```

### 5. Setup Prisma

```bash
bunx prisma migrate dev
bunx prisma generate
```

### 6. Add course transcripts

Place your `.srt` files inside:

```text
class-subtitle/
```

The dataset is intentionally excluded from Git using `.gitignore`.

### 7. Run ingestion

Run the project's ingestion scripts to:

1. Parse SRT files
2. Create transcript chunks
3. Store chunks in PostgreSQL
4. Generate embeddings
5. Store vectors and metadata in Qdrant

---

## ▶️ Running the Application

Start the Express server:

```bash
bun run src/index.ts
```

In another terminal, start the local Inngest development server:

```bash
npx --ignore-scripts=false inngest-cli@latest dev
```

The backend runs on:

```text
http://localhost:3000
```

---

## 🧪 Testing

The RAG pipeline can be tested directly with:

```bash
bun src/rag/test.ts
```

Example query:

```text
What is the overview of the course projects?
```

The test executes the RAG pipeline and then generates a natural-language response containing the answer and relevant course locations/timestamps.

---

## ⚙️ Inngest

The RAG pipeline is orchestrated using Inngest.

Each major stage is represented as an individual workflow step:

```ts
step.run("input-guardrail", ...)
step.run("enhance-query", ...)
step.run("decompose-query", ...)
step.run("retrieve-evidence", ...)
step.run("generate-answer-1", ...)
step.run("resolve-sources-1", ...)
step.run("evaluate-answer-1", ...)
step.run("output-guardrail-1", ...)
```

This provides:

- Durable workflow execution
- Step-level visibility
- Retry support
- Easier debugging
- Background execution

Inngest orchestrates the workflow while the application backend executes the actual RAG operations.

---

## 🔐 Security

Sensitive configuration is stored in environment variables.

The following should not be committed:

```text
.env
class-subtitle/
src/generated/prisma/
```

The course dataset is private and is intentionally excluded from version control.

---

## 📌 Current Dataset

The current course dataset contains:

- **87 lecture files**
- **796 indexed transcript chunks**

The transcript data is stored across PostgreSQL and Qdrant.

---

## 🚧 Future Improvements

- More precise subtitle-level timestamp attribution
- Better source attribution per decomposed query
- Streaming responses with SSE/WebSockets
- Frontend integration
- Persistent query/result storage
- Advanced reranking models
- Hybrid keyword + vector retrieval
- Improved evaluation metrics
- Observability and tracing
- Authentication and rate limiting
- Production deployment

---

## 🎯 Project Goal

The goal of this project is to build and understand an advanced RAG system from the ground up while keeping each component explicit and independently understandable.

Rather than relying on an end-to-end RAG framework, the project implements the major components directly:

```text
Ingestion
   ↓
Chunking
   ↓
Embeddings
   ↓
Vector Database
   ↓
Query Enhancement
   ↓
Query Decomposition
   ↓
Query Routing
   ↓
Hybrid Retrieval
   ↓
Reranking
   ↓
Answer Generation
   ↓
Evaluation
   ↓
Retry
   ↓
Output Guardrail
   ↓
Final Response
```

---

## 📄 License

This project is intended for educational and experimental purposes.

Add the license of your choice before publishing the repository.