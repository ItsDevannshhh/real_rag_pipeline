import { prisma } from "../db/prisma";
import { findSrtFiles } from "./srt-reader";
import { parseSrt } from "./parser";
import { chunkSubtitles } from "./chunker";

export async function ingestLecture(
    courseName: string,
    file: {
        filePath: string;
        moduleName: string;
        lectureName: string;
        fileName: string;
    }
) {
    // 1. Get or create the course
    const course = await prisma.course.upsert({
        where: {
            name: courseName,
        },
        update: {},
        create: {
            name: courseName,
        },
    });

    // 2. Get or create the module
    const module = await prisma.module.upsert({
        where: {
            courseId_name: {
                courseId: course.id,
                name: file.moduleName,
            },
        },
        update: {},
        create: {
            name: file.moduleName,
            courseId: course.id,
        },
    });

    // 3. Get or create the lecture
    const lecture = await prisma.lecture.upsert({
        where: {
            moduleId_name: {
                moduleId: module.id,
                name: file.lectureName,
            },
        },
        update: {
            fileName: file.fileName,
        },
        create: {
            name: file.lectureName,
            fileName: file.fileName,
            moduleId: module.id,
        },
    });

    // 4. Parse the SRT
    const subtitles = await parseSrt(file.filePath);

    // 5. Create chunks
    const chunks = chunkSubtitles(subtitles);

    // 6. Store chunks
    await prisma.chunk.deleteMany({
        where: {
            lectureId: lecture.id,
        },
    });

    await prisma.chunk.createMany({
        data: chunks.map((chunk) => ({
            text: chunk.text,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            lectureId: lecture.id,
        })),
    });

    return {
        course,
        module,
        lecture,
        chunkCount: chunks.length,
    };
}