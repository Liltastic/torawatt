-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "isOpen24h" BOOLEAN NOT NULL,
    "amenities" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "powerKw" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "pricePerKwh" REAL,
    "idleFeePerMin" REAL,
    CONSTRAINT "Connector_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "batteryCapacityKwh" REAL NOT NULL,
    "maxAcKw" REAL NOT NULL,
    "maxDcKw" REAL NOT NULL,
    "connectors" TEXT NOT NULL,
    "averageConsumptionKwhPer100Km" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "connectorLabel" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChargingHistoryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "stationId" TEXT,
    "stationName" TEXT NOT NULL,
    "connectorLabel" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "energyKwh" REAL NOT NULL,
    "pricePerKwh" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Connector_stationId_idx" ON "Connector"("stationId");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");

-- CreateIndex
CREATE INDEX "Reservation_ownerId_idx" ON "Reservation"("ownerId");

-- CreateIndex
CREATE INDEX "ChargingHistoryEntry_ownerId_idx" ON "ChargingHistoryEntry"("ownerId");

-- CreateIndex
CREATE INDEX "PaymentMethod_ownerId_idx" ON "PaymentMethod"("ownerId");
