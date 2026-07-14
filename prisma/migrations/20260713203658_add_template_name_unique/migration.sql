/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `templates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "templates_name_key" ON "templates"("name");
