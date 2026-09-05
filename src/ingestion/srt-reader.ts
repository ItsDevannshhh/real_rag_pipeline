import { readdir } from "node:fs/promises";
import path from "node:path";

export interface SrtFile {
    filePath: string;
    moduleName: string;
    lectureName: string;
    fileName: string;
}

export async function findSrtFiles(
    rootDir: string
): Promise<SrtFile[]> {
    const result: SrtFile[] = [];

    // Get everything inside class-subtitle/
    const modules = await readdir(rootDir, {
        withFileTypes: true,
    });

    for (const module of modules) {
        // We only care about directories
        if (!module.isDirectory()) {
            continue;
        }

        // We only want folders starting with "module"
        if (!module.name.toLowerCase().startsWith("module")) {
            continue;
        }

        const modulePath = path.join(rootDir, module.name);

        // Get lecture directories inside the module
        const lectures = await readdir(modulePath, {
            withFileTypes: true,
        });

        for (const lecture of lectures) {
            // Each lecture is a directory
            if (!lecture.isDirectory()) {
                continue;
            }

            const lecturePath = path.join(modulePath, lecture.name);

            // Get files inside the lecture directory
            const files = await readdir(lecturePath, {
                withFileTypes: true,
            });

            for (const file of files) {
                // Ignore directories
                if (!file.isFile()) {
                    continue;
                }

                // We only process .srt files
                if (!file.name.toLowerCase().endsWith(".srt")) {
                    continue;
                }

                result.push({
                    filePath: path.join(lecturePath, file.name),
                    moduleName: module.name,
                    lectureName: lecture.name,
                    fileName: file.name,
                });
            }
        }
    }

    return result;
}