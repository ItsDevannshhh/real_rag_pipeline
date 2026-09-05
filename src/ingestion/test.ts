// test file only
import { ai } from "../db/ai";

const models = await ai.models.list();

for await (const model of models) {
    console.log(model.id);
}