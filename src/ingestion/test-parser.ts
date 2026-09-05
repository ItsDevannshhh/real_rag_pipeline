import { findSrtFiles } from "./srt-reader";
import { parseSrt } from "./parser";

const files = await findSrtFiles("./class-subtitle");

console.log(`Found ${files.length} SRT files\n`);

if (files.length === 0) {
    throw new Error("No SRT files found");
}

const firstFile = files[0];

if (!firstFile) {
    throw new Error("First SRT file is undefined");
}

console.log("========== FILE ==========");
console.log(`Module  : ${firstFile.moduleName}`);
console.log(`Lecture : ${firstFile.lectureName}`);
console.log(`File    : ${firstFile.fileName}`);
console.log(`Path    : ${firstFile.filePath}`);

const subtitles = await parseSrt(firstFile.filePath);

console.log("\n========== PARSED ==========");
console.log(`Subtitles: ${subtitles.length}\n`);

for (const subtitle of subtitles.slice(0, 10)) {
    console.log(
        `[${subtitle.index}] ` +
        `${subtitle.startTime} --> ${subtitle.endTime}`
    );

    console.log(subtitle.text);
    console.log();
}

// test file only