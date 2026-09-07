import "dotenv/config";

import express from "express";
import { serve } from "inngest/express";

import { inngest } from "./inngest/client";
import { ragPipeline } from "./inngest/functions/rag-pipeline";

const app = express();

app.use(express.json());

app.use(
    "/api/inngest",
    serve({
        client: inngest,
        functions: [ragPipeline],
    })
);

app.post("/api/rag", async (req, res) => {
    try {
        const { query } = req.body;

        if (
            typeof query !== "string" ||
            query.trim().length === 0
        ) {
            return res.status(400).json({
                error: "Query is required",
            });
        }

        const result = await inngest.send({
            name: "rag/query.requested",
            data: {
                query: query.trim(),
            },
        });

        return res.status(202).json({
            message: "RAG query accepted",
            eventId: result.ids[0],
        });
    } catch (error) {
        console.error("Failed to submit RAG query:", error);

        return res.status(500).json({
            error: "Failed to submit RAG query",
        });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});