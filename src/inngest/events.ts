export type RagQueryEvent = {
    name: "rag/query.requested";

    data: {
        query: string;
    };
};