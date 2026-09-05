import "dotenv/config";
import { qdrant } from "./db/qdrant";

const collections = await qdrant.getCollections();

console.log("Qdrant connected:");
console.log(collections);