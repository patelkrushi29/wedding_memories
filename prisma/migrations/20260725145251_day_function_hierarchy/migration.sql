-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "source" TEXT,
ADD COLUMN     "uploaderName" TEXT,
ADD COLUMN     "viewerPath" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Tag_parentId_idx" ON "Tag"("parentId");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing EVENT tags become FUNCTION tags under the new day→function spine
UPDATE "Tag" SET "kind" = 'FUNCTION' WHERE "kind" = 'EVENT';
