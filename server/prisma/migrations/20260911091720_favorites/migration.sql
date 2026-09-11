-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_ownerId_idx" ON "Favorite"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_ownerId_stationId_key" ON "Favorite"("ownerId", "stationId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
