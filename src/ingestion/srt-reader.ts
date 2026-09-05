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

    const absoluteRoot = path.resolve(rootDir);

    const modules = await readdir(absoluteRoot, {
        withFileTypes: true,
    });

    for (const module of modules) {
        if (!module.isDirectory()) {
            continue;
        }

        if (!module.name.toLowerCase().startsWith("module")) {
            continue;
        }

        const modulePath = path.join(
            absoluteRoot,
            module.name
        );

        const lectures = await readdir(modulePath, {
            withFileTypes: true,
        });

        for (const lecture of lectures) {
            if (!lecture.isDirectory()) {
                continue;
            }

            const lecturePath = path.join(
                modulePath,
                lecture.name
            );

            const files = await readdir(lecturePath, {
                withFileTypes: true,
            });

            for (const file of files) {
                if (!file.isFile()) {
                    continue;
                }

                if (!file.name.toLowerCase().endsWith(".srt")) {
                    continue;
                }

                result.push({
                    filePath: path.join(
                        lecturePath,
                        file.name
                    ),
                    moduleName: module.name,
                    lectureName: lecture.name,
                    fileName: file.name,
                });
            }
        }
    }

    return result;
}