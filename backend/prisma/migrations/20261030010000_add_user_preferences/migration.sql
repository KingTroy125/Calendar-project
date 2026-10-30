-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "weekStartsOn" TEXT NOT NULL DEFAULT 'monday',
ADD COLUMN     "defaultEventDuration" INTEGER NOT NULL DEFAULT 60;
