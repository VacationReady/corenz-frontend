/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `WorkingPattern` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkingPattern_name_key" ON "WorkingPattern"("name");
