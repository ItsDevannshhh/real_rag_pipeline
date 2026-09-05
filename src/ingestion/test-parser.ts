import { findSrtFiles } from "./srt-reader";
import { parseSrt } from "./parser";

const files = await findSrtFiles("./class-subtitle");

console.log(`Found ${files.length} SRT files\n`);

let successful = 0;
let failed = 0;

for (const file of files) {
    try {
        const subtitles = await parseSrt(file.filePath);

        if (subtitles.length === 0) {
            console.log(`⚠️  No subtitles: ${file.filePath}`);
            failed++;
            continue;
        }

        console.log(
            `✅ ${file.moduleName} / ${file.lectureName} → ${subtitles.length} subtitles`
        );

        successful++;
    } catch (error) {
        console.error(`❌ Failed: ${file.filePath}`);
        console.error(error);

        failed++;
    }
}

console.log("\n========== SUMMARY ==========");
console.log(`Total     : ${files.length}`);
console.log(`Successful: ${successful}`);
console.log(`Failed    : ${failed}`);

// test file only