/*
  Warnings:

  - You are about to drop the column `number` on the `Module` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moduleId,name]` on the table `Lecture` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[courseId,name]` on the table `Module` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Module_courseId_number_key";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "number";

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE INDEX "Lecture_moduleId_idx" ON "Lecture"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Lecture_moduleId_name_key" ON "Lecture"("moduleId", "name");

-- CreateIndex
CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_name_key" ON "Module"("courseId", "name");
