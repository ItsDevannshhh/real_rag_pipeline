# Advanced RAG Pipeline

A production-style **Advanced Retrieval-Augmented Generation (RAG)** system built around course subtitle data. This project extends a simple vector RAG pipeline into a multi-stage architecture that combines **Qdrant vector search, PostgreSQL/SQL retrieval, query transformation, query routing, reranking, LLM-based evaluation, retries, and input/output guardrails**.

The goal is not just to retrieve similar chunks, but to build a reliable question-answering pipeline that can decide **what to retrieve, where to retrieve it from, how to rank it, and whether the generated answer is good enough**.

---

## Table of Contents

- [Overview](#overview)
- [Why Advanced RAG](#why-advanced-rag)
- [Architecture](#architecture)
- [End-to-End Flow](#end-to-end-flow)
- [1. Data Ingestion](#1-data-ingestion)
- [2. Database Layer](#2-database-layer)
- [3. Input Guardrails](#3-input-guardrails)
- [4. Query Enhancement](#4-query-enhancement)
- [5. Query Decomposition](#5-query-decomposition)
- [6. Query Routing](#6-query-routing)
- [7. Retrieval](#7-retrieval)
- [8. Ranking / Reranking](#8-ranking--reranking)
- [9. RAG Generation](#9-rag-generation)
- [10. Answer Evaluation](#10-answer-evaluation)
- [11. Retry Mechanism](#11-retry-mechanism)
- [12. Output Guardrails](#12-output-guardrails)
- [13. API Routes](#13-api-routes)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Docker Infrastructure](#docker-infrastructure)
- [Environment Variables](#environment-variables)
- [Implementation Roadmap](#implementation-roadmap)
- [Simple RAG vs Advanced RAG](#simple-rag-vs-advanced-rag)
- [Important Design Principles](#important-design-principles)
- [Future Improvements](#future-improvements)

---

# Overview

The system uses subtitle files from a course as its knowledge source.

The source data is provided as `.srt` files. The subtitles are parsed, cleaned, chunked, embedded, and stored in both:

- **Qdrant** → semantic/unstructured retrieval
- **PostgreSQL** → structured/relational retrieval

When a user asks a question, the system does not immediately perform vector search.

Instead, the query passes through multiple stages:

```text
User Query
    |
    v
Input Guardrails
    |
    v
Query Enhancement
    |
    v
Query Decomposition
    |
    v
Query Routing
    |
    +--------------------+
    |                    |
    v                    v
Qdrant Vector DB     PostgreSQL
    |                    |
    +---------+----------+
              |
              v
       Candidate Results
              |
              v
      Ranking / Reranking
              |
              v
            Top 5
              |
              v
        LLM Generation
              |
              v
       Answer Evaluation
              |
        +-----+-----+
        |           |
      < 6           >= 6
        |           |
        v           v
      Retry     Output Guardrail
     (max 3)         |
                     v
              Final Response
```

---

# Why Advanced RAG?

A basic RAG pipeline generally looks like:

```text
Question
   |
Embedding
   |
Vector Search
   |
Top K Chunks
   |
LLM
   |
Answer
```

This works well for many simple use cases, but production systems often need more.

For example:

- The user query may be vague.
- One question may contain multiple questions.
- Different parts of a question may require different data sources.
- Vector search can return noisy results.
- The best retrieved chunks may not be the first vector-search results.
- The generated answer may be incomplete or incorrect.
- Sensitive requests should be rejected before retrieval.
- Generated answers should also be checked before being returned.

Advanced RAG addresses these problems by adding multiple intelligence and validation layers.

---

# Architecture

## High-Level Architecture

```text
                         +------------------+
                         |   User / Client  |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         | Input Guardrail  |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         | Query Enhancement|
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         | Query Decompose  |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         |   Query Router   |
                         |       (LLM)      |
                         +--------+---------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
          +------------------+           +------------------+
          |  Qdrant Vector   |           |   PostgreSQL     |
          |       DB         |           |    / SQL DB      |
          +--------+---------+           +--------+---------+
                   |                             |
                   +--------------+--------------+
                                  |
                                  v
                         +------------------+
                         | Candidate Results|
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         | Ranking/Reranking|
                         +--------+---------+
                                  |
                                  v
                              Top 5
                                  |
                                  v
                         +------------------+
                         |  RAG Generator   |
                         |      (LLM)       |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         | Answer Evaluator |
                         |      (LLM)       |
                         +--------+---------+
                                  |
                    +-------------+-------------+
                    |                           |
                  Score < 6                  Score >= 6
                    |                           |
                    v                           v
                 Retry                    Output Guardrail
                Max 3 times                    |
                                                v
                                         Final Response
```

---

# End-to-End Flow

A complete request follows this pipeline:

```text
1. User submits question
        ↓
2. Input guardrail
        ↓
3. Query enhancement
        ↓
4. Query decomposition
        ↓
5. Query routing
        ↓
6. Retrieve from Qdrant and/or PostgreSQL
        ↓
7. Collect candidate results
        ↓
8. Rank / rerank candidates
        ↓
9. Select Top 5
        ↓
10. Generate answer using LLM
        ↓
11. Evaluate generated answer
        ↓
12. If score < 6 → retry
        ↓
13. Maximum 3 attempts
        ↓
14. Output guardrail
        ↓
15. Return final answer
```

---

# 1. Data Ingestion

The initial knowledge source is a collection of course subtitle files.

Example:

```text
subtitles/
├── lecture-01.srt
├── lecture-02.srt
├── lecture-03.srt
└── ...
```

An SRT file contains:

```text
1
00:00:01,000 --> 00:00:04,000
Welcome to the course.

2
00:00:04,000 --> 00:00:08,000
Today we are going to learn about React.
```

The ingestion pipeline converts this into structured transcript data.

```text
SRT Files
   |
   v
Subtitle Parser
   |
   v
Clean Transcript
   |
   v
Metadata Extraction
   |
   v
Chunking
   |
   +----------------------+
   |                      |
   v                      v
PostgreSQL             Embeddings
                           |
                           v
                        Qdrant
```

A subtitle entry can conceptually become:

```json
{
  "lecture": "lecture-01",
  "startTime": 4,
  "endTime": 8,
  "text": "Today we are going to learn about React."
}
```

After chunking:

```json
{
  "lecture": "lecture-01",
  "chunkIndex": 3,
  "text": "React is a JavaScript library used for building...",
  "metadata": {
    "startTime": 120,
    "endTime": 180
  }
}
```

## Why Chunking?

Embedding an entire lecture into one vector would make retrieval too coarse.

Instead:

```text
Lecture
   |
   +-- Chunk 1
   +-- Chunk 2
   +-- Chunk 3
   +-- ...
```

Smaller meaningful chunks allow Qdrant to retrieve the most relevant parts of the course.

---

# 2. Database Layer

The system intentionally uses **two different databases for two different retrieval strategies**.

## Qdrant

Qdrant is used for semantic retrieval.

Example:

> "Explain how React manages component state."

The system converts the query into an embedding and searches for semantically similar transcript chunks.

```text
Question
   |
Embedding Model
   |
Query Vector
   |
Qdrant
   |
Relevant Chunks
```

---

## PostgreSQL

PostgreSQL stores structured information.

Possible schema:

```text
courses
    |
    +-- lectures
           |
           +-- transcript entries
           |
           +-- chunks
```

PostgreSQL can answer structured questions such as:

> "How many lectures are present?"

or:

> "Which lecture contains this topic?"

---

## Multi-Source Retrieval

Some questions may require both sources.

Example:

> "Which lecture explains authentication, and how many lectures are in the course?"

The router may send:

```text
Question 1 → Qdrant
Question 2 → PostgreSQL
```

The results are then combined before generation.

---

# 3. Input Guardrails

The input guardrail is the first safety layer.

```text
User Query
    |
    v
Input Guardrail
    |
    +---- Unsafe/Sensitive ---> Reject
    |
    +---- Safe ---------------> Continue
```

The purpose is to prevent users from using the system to request sensitive or disallowed information.

Examples of requests that may need to be rejected:

```text
- Passwords
- Credentials
- Private personal information
- Sensitive data extraction
```

Guardrails should happen before expensive retrieval and generation operations.

---

# 4. Query Enhancement

Users do not always write ideal retrieval queries.

Example:

```text
User:
"react hooks"
```

The query enhancement stage asks an LLM to transform it into a more useful query.

Example:

```text
Original:
react hooks

Enhanced:
"Explain React Hooks, their purpose, important types,
and examples discussed in the course."
```

This can improve retrieval quality.

---

## Query Translation Techniques

This architecture can support multiple query-transformation techniques:

### Query Rewrite

Rewrite the original query into a clearer retrieval query.

### Step-Back Prompting

Move from a very specific question toward a broader conceptual question.

Example:

```text
Specific:
"Why does useEffect run twice in development?"

Step-back:
"How does React's effect execution behavior work
in development mode?"
```

### HyDE

HyDE means **Hypothetical Document Embeddings**.

Instead of embedding the question directly:

```text
Question
   |
   v
LLM generates hypothetical answer/document
   |
   v
Embed hypothetical document
   |
   v
Vector Search
```

The hypothetical document can sometimes be closer in semantic space to the actual source documents.

---

# 5. Query Decomposition

Complex questions can contain multiple independent sub-questions.

Example:

> "Explain React Hooks, compare useState and useEffect, and tell me which lecture discusses them."

The LLM can decompose this into:

```text
Q1 → What are React Hooks?

Q2 → What is useState?

Q3 → What is useEffect?

Q4 → What is the difference between useState and useEffect?

Q5 → Which lecture discusses these topics?
```

Each sub-query can then be routed independently.

```text
User Query
    |
    v
LLM
    |
    +-- Sub Query 1
    +-- Sub Query 2
    +-- Sub Query 3
    +-- Sub Query 4
```

This improves retrieval for complex questions.

---

# 6. Query Routing

The router decides **where each sub-query should be answered from**.

```text
Sub Query
    |
    v
LLM Router
   / \
  /   \
 v     v
Qdrant PostgreSQL
```

Example:

### Semantic question

> "Explain React Hooks."

```text
Router → Qdrant
```

Then:

```text
Query
 ↓
Embedding
 ↓
Qdrant Search
```

### Structured question

> "How many lectures are in the course?"

```text
Router → PostgreSQL
```

Then:

```text
Question
 ↓
Text-to-SQL
 ↓
SQL Validation
 ↓
PostgreSQL
 ↓
Result
```

---

# Text-to-SQL

For SQL-routed questions, the LLM can translate natural language into SQL.

Example:

```text
User:
"How many lectures are in the course?"
```

LLM:

```sql
SELECT COUNT(*) FROM lectures;
```

PostgreSQL:

```text
42
```

The SQL execution layer should be restricted and validated.

The LLM should **not** be trusted with unrestricted database permissions.

Recommended approach:

```text
LLM-generated SQL
       |
       v
SQL validation
       |
       v
Read-only / restricted DB user
       |
       v
PostgreSQL
```

---

# 7. Retrieval

## Vector Retrieval

The vector retrieval path is:

```text
Sub Query
    |
    v
Embedding Model
    |
    v
Vector
    |
    v
Qdrant
    |
    v
Candidate Chunks
```

The architecture can initially retrieve around **120 candidates**.

```text
Query
 ↓
Qdrant
 ↓
~120 candidates
```

The large candidate set gives the reranking stage enough information to find the best results.

---

## SQL Retrieval

SQL retrieval follows:

```text
Sub Query
    |
    v
Text-to-SQL
    |
    v
SQL Validation
    |
    v
PostgreSQL
    |
    v
Structured Results
```

---

# 8. Ranking / Reranking

Vector similarity alone does not always produce the best final ordering.

Therefore:

```text
~120 candidates
       |
       v
Ranking / Reranking
       |
       v
Top 5
```

Example:

```text
Candidate 1 → 0.71
Candidate 2 → 0.95
Candidate 3 → 0.62
Candidate 4 → 0.91
...
```

The reranker re-evaluates relevance and selects the strongest results.

Finally:

```text
Top 5 Results
```

are provided to the generation model.

---

# 9. RAG Generation

The generator receives:

```text
Original User Question
        +
Retrieved Top 5 Results
        |
        v
       LLM
        |
        v
Generated Answer
```

Example prompt structure:

```text
You are an assistant answering questions using
the provided course context.

Question:
...

Context:
1. ...
2. ...
3. ...
4. ...
5. ...

Generate a clear answer using the provided context.
```

The goal is to ground the answer in retrieved information instead of relying only on the model's internal knowledge.

---

# 10. Answer Evaluation

The generated answer is not immediately returned.

Instead, a second LLM evaluates it.

```text
User Question
      +
Generated Answer
      |
      v
Answer Evaluator
      |
      v
Score 1-10
```

Example:

```json
{
  "score": 8,
  "reason": "The answer directly addresses the question
             and is supported by the retrieved context."
}
```

The evaluator can consider:

- Relevance
- Correctness
- Completeness
- Context grounding
- Clarity

---

# 11. Retry Mechanism

The evaluation threshold is:

```text
score >= 6 → accepted
score < 6  → retry
```

Maximum attempts:

```text
3
```

Conceptually:

```text
             Generate
                |
                v
             Evaluate
                |
         +------+------+
         |             |
       < 6            >= 6
         |             |
         v             v
       Retry       Continue
         |
         v
      Attempt 2
         |
         v
      Attempt 3
         |
         v
     Final Result
```

Pseudo-code:

```ts
for (let attempt = 1; attempt <= 3; attempt++) {
  const answer = await generateAnswer(context, query);

  const evaluation = await evaluateAnswer(query, answer);

  if (evaluation.score >= 6) {
    return answer;
  }
}

return bestAvailableAnswer;
```

A production implementation can make each retry more intelligent by changing the query, retrieval strategy, context, or generation prompt based on the evaluator's feedback.

---

# 12. Output Guardrails

After the answer is accepted, it passes through the final safety layer.

```text
Generated Answer
      |
      v
Output Guardrail
      |
      +---- Unsafe ---> Block / Sanitize
      |
      +---- Safe -----> Return
```

This protects against sensitive information accidentally appearing in the generated response.

The complete safety flow is therefore:

```text
            USER
              |
              v
      Input Guardrail
              |
              v
         RAG Pipeline
              |
              v
       Output Guardrail
              |
              v
        FINAL RESPONSE
```

---

# 13. API Routes

Routes are the HTTP entry points into the application.

Routes should remain thin.

They should:

1. Receive HTTP request
2. Validate basic input
3. Call application/service logic
4. Return HTTP response

They should **not contain the entire RAG implementation**.

Example:

```text
POST /query
      |
      v
routes/query.ts
      |
      v
rag/orchestrator.ts
```

Possible routes:

```text
POST /query
```

Starts the RAG query pipeline.

```text
POST /documents
```

Starts document/subtitle ingestion.

```text
GET /jobs/:id
```

Checks an asynchronous job.

```text
GET /health
```

Checks application health.

---

# Project Structure

A suggested structure:

```text
real-rag/
│
├── src/
│   │
│   ├── routes/
│   │   ├── query.ts
│   │   ├── documents.ts
│   │   └── health.ts
│   │
│   ├── ingestion/
│   │   ├── srt-parser.ts
│   │   ├── chunker.ts
│   │   ├── embedder.ts
│   │   └── ingest.ts
│   │
│   ├── rag/
│   │   ├── orchestrator.ts
│   │   ├── guardrails.ts
│   │   ├── query-rewriter.ts
│   │   ├── query-decomposer.ts
│   │   ├── router.ts
│   │   ├── vector-retrieval.ts
│   │   ├── sql-retrieval.ts
│   │   ├── reranker.ts
│   │   ├── generator.ts
│   │   └── evaluator.ts
│   │
│   ├── db/
│   │   ├── postgres.ts
│   │   └── qdrant.ts
│   │
│   └── index.ts
│
├── subtitles/
│   ├── lecture-01.srt
│   ├── lecture-02.srt
│   └── ...
│
├── prisma/
│
├── docker-compose.yml
├── package.json
├── .env
├── .env.example
└── README.md
```

---

# Technology Stack

## Backend

- Bun
- TypeScript
- Hono

## AI / LLM

- LLM provider SDK
- LangChain.js for reusable AI/RAG components where useful
- LangGraph.js if the workflow becomes stateful/complex

## Databases

- PostgreSQL
- Prisma ORM
- Qdrant

## Data Processing

- SRT subtitle parser
- Text chunking
- Embedding model

## Infrastructure

- Docker
- Docker Compose

---

# Docker Infrastructure

For local development, PostgreSQL and Qdrant can run through Docker Compose.

```yaml
services:
  postgres:
    image: postgres:17
    container_name: rag-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rag_db
    ports:
      - "5432:5432"

  qdrant:
    image: qdrant/qdrant:latest
    container_name: rag-qdrant
    restart: unless-stopped
    ports:
      - "6333:6333"
      - "6334:6334"
```

No volumes are intentionally configured in this development setup.

Therefore, database/container data is ephemeral.

PostgreSQL:

```text
postgresql://postgres:postgres@localhost:5432/rag_db
```

Qdrant:

```text
http://localhost:6333
```

---

# Environment Variables

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rag_db"

QDRANT_URL="http://localhost:6333"

OPENAI_API_KEY="your-api-key"

EMBEDDING_MODEL="your-embedding-model"

LLM_MODEL="your-llm-model"
```

Do not commit real secrets to GitHub.

Use:

```text
.env
```

locally and provide:

```text
.env.example
```

for other developers.

---

# Implementation Roadmap

The project should be implemented incrementally.

## Phase 1 — Infrastructure

- [ ] Initialize Bun + TypeScript project
- [ ] Setup Hono
- [ ] Setup PostgreSQL
- [ ] Setup Prisma
- [ ] Setup Qdrant
- [ ] Verify Docker services

---

## Phase 2 — Subtitle Ingestion

- [ ] Read `.srt` files
- [ ] Parse subtitle entries
- [ ] Clean transcript text
- [ ] Extract lecture metadata
- [ ] Chunk transcripts
- [ ] Store structured data in PostgreSQL

---

## Phase 3 — Vector Database

- [ ] Generate embeddings
- [ ] Create Qdrant collection
- [ ] Store vectors
- [ ] Store chunk metadata
- [ ] Test similarity search

---

## Phase 4 — Basic RAG

Build the simplest working pipeline:

```text
Query
 ↓
Embedding
 ↓
Qdrant
 ↓
Top K
 ↓
LLM
 ↓
Answer
```

Do not add all advanced features before basic RAG works.

---

## Phase 5 — Input Guardrails

- [ ] Validate user queries
- [ ] Detect sensitive requests
- [ ] Reject unsafe queries

---

## Phase 6 — Query Transformation

- [ ] Query rewriting
- [ ] Query decomposition
- [ ] Optional step-back prompting
- [ ] Optional HyDE

---

## Phase 7 — Query Routing

- [ ] Build LLM router
- [ ] Add Qdrant route
- [ ] Add SQL route
- [ ] Add Text-to-SQL
- [ ] Validate generated SQL

---

## Phase 8 — Retrieval Optimization

- [ ] Retrieve candidate results
- [ ] Combine multi-source results
- [ ] Add reranking
- [ ] Select Top 5

---

## Phase 9 — Generation

- [ ] Build RAG prompt
- [ ] Generate grounded answer
- [ ] Include relevant source metadata

---

## Phase 10 — Evaluation

- [ ] Add evaluator LLM
- [ ] Generate score from 1-10
- [ ] Set acceptance threshold to 6
- [ ] Add retry logic
- [ ] Limit retries to 3

---

## Phase 11 — Output Safety

- [ ] Add output guardrail
- [ ] Detect sensitive information
- [ ] Sanitize/block unsafe output

---

## Phase 12 — Async Processing

For larger/production-style workloads:

```text
POST /query
     |
     v
Queue
     |
     v
job_id
     |
     v
Worker
     |
     v
RAG Pipeline
     |
     v
Result
```

The first implementation can remain synchronous.

Async processing should be introduced after the core pipeline works.

---

# Simple RAG vs Advanced RAG

| Feature | Simple RAG | This Project |
|---|---:|---:|
| Document ingestion | Yes | Yes |
| Chunking | Yes | Yes |
| Embeddings | Yes | Yes |
| Vector DB | Yes | Yes |
| Basic retrieval | Yes | Yes |
| Input guardrails | Usually no | Yes |
| Query rewriting | Optional | Yes |
| Query decomposition | No | Yes |
| Query routing | No | Yes |
| SQL retrieval | No | Yes |
| Text-to-SQL | No | Yes |
| Candidate ranking | Basic | Yes |
| Reranking | Optional | Yes |
| Top 5 selection | Basic | Yes |
| Answer evaluation | No | Yes |
| Retry loop | No | Yes |
| Output guardrails | Usually no | Yes |
| Async jobs | Optional | Future |

---

# Important Design Principles

## 1. Keep Routes Thin

Bad:

```text
routes/query.ts
    ├── guardrails
    ├── embeddings
    ├── Qdrant
    ├── SQL
    ├── ranking
    ├── LLM
    └── evaluation
```

Better:

```text
routes/query.ts
      |
      v
rag/orchestrator.ts
      |
      ├── guardrails
      ├── translation
      ├── routing
      ├── retrieval
      ├── reranking
      ├── generation
      └── evaluation
```

---

## 2. Authentication and Authorization Are Not LLM Responsibilities

If the system later contains user-specific/private data:

```text
Authentication
    ↓
Who is the user?

Authorization
    ↓
What is the user allowed to access?
```

The LLM should never be trusted to decide permissions.

The application should enforce access control before data reaches the model.

---

## 3. Qdrant and PostgreSQL Solve Different Problems

Think:

```text
Qdrant
= "Find information that is semantically similar."

PostgreSQL
= "Find structured information using exact relationships/conditions."
```

They complement each other.

---

## 4. Retrieval and Generation Are Separate

The retriever finds evidence.

The generator produces the answer.

```text
Retriever
    ↓
Evidence
    ↓
Generator
    ↓
Answer
```

Keeping these responsibilities separate makes the system easier to debug.

---

## 5. Evaluation Should Be Observable

When the evaluator gives:

```text
score: 4
```

do not simply retry blindly.

Store useful debugging information such as:

```text
query
attempt
retrieved chunks
generated answer
evaluation score
evaluation reason
```

This will help identify why the RAG pipeline failed.

---

# Future Improvements

Once the core assignment works, the architecture can be extended with:

- Hybrid search
- BM25 + vector search
- Better rerankers
- Metadata filtering
- Source citations
- Query caching
- Response caching
- Streaming responses
- Conversation memory
- User-specific access control
- Observability/tracing
- LangGraph workflow orchestration
- Inngest/background jobs
- Queue-based asynchronous processing
- Evaluation datasets
- Automated RAG benchmarks
- Production deployment
- Rate limiting
- More robust SQL validation

---

# Final Mental Model

The easiest way to remember this architecture is:

```text
                 ADVANCED RAG
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
      SAFETY       QUERY          DATA
        |        PROCESSING      SOURCES
        |             |             |
     Input         Rewrite       Qdrant
     Guardrail     Decompose     PostgreSQL
                   Route
                      |
                      v
                   RETRIEVE
                      |
                      v
                ~120 Candidates
                      |
                      v
                  RERANKING
                      |
                      v
                    Top 5
                      |
                      v
                  GENERATE
                      |
                      v
                  EVALUATE
                      |
               +------+------+
               |             |
             < 6           >= 6
               |             |
             RETRY       Output Guardrail
            max 3             |
                              v
                           RESPONSE
```

The key difference from simple RAG is that **retrieval is no longer a single vector-search operation**.

The system intelligently decides:

> **Is the query safe? → How should I transform it? → Does it contain multiple questions? → Which database should answer each part? → What are the best results? → Is the generated answer good enough? → Is the final output safe?**

That is the core idea behind this Advanced RAG project.
