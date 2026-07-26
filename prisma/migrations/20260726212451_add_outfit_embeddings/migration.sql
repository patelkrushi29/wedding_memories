-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "outfitAt" TIMESTAMP(3),
ADD COLUMN     "outfitEmbedding" DOUBLE PRECISION[],
ADD COLUMN     "outfitPeople" INTEGER;
