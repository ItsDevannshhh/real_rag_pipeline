import { findSrtFiles } from "./srt-reader";
import { ingestLecture } from "./database";

const COURSE_NAME = "Mobile Development";

const files = await findSrtFiles("./class-subtitle");

console.log(`Found ${files.length} SRT files\n`);

let successful = 0;
let failed = 0;

for (const [index, file] of files.entries()) {
    console.log(
        `[${index + 1}/${files.length}] ` +
        `${file.moduleName} / ${file.lectureName}`
    );

    try {
        const result = await ingestLecture(
            COURSE_NAME,
            file
        );

        console.log(
            `  ✓ ${result.chunkCount} chunks`
        );

        successful++;
    } catch (error) {
        failed++;

        console.error(
            `  ✗ Failed: ${file.fileName}`
        );

        console.error(error);
    }
}

console.log("\n========== COMPLETE ==========");
console.log(`Total      : ${files.length}`);
console.log(`Successful : ${successful}`);
console.log(`Failed     : ${failed}`);