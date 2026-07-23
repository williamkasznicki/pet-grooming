-- AlterTable
ALTER TABLE "MdPetSize" ADD COLUMN     "maxWeightKg" DECIMAL(5,2),
ADD COLUMN     "minWeightKg" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "weightKg" DECIMAL(5,2);
