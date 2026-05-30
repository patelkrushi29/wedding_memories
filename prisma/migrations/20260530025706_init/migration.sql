-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "relativePath" TEXT,
    "coverAssetId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "albumId" TEXT,
    "filename" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" REAL,
    "thumbnailPath" TEXT,
    "posterPath" TEXT,
    "takenAt" DATETIME,
    "modifiedAt" DATETIME NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "checksum" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appName" TEXT NOT NULL DEFAULT 'Wedding Memories',
    "coupleNames" TEXT,
    "weddingDate" DATETIME,
    "guestPasswordHash" TEXT,
    "requirePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FuturePerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "coverAssetId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FutureFaceMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "boundingBoxJson" TEXT,
    "confidence" REAL,
    "provider" TEXT,
    "externalFaceId" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Album_slug_idx" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Album_isHidden_idx" ON "Album"("isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_relativePath_key" ON "Asset"("relativePath");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_albumId_idx" ON "Asset"("albumId");

-- CreateIndex
CREATE INDEX "Asset_filename_idx" ON "Asset"("filename");

-- CreateIndex
CREATE INDEX "Asset_takenAt_idx" ON "Asset"("takenAt");

-- CreateIndex
CREATE INDEX "Asset_modifiedAt_idx" ON "Asset"("modifiedAt");

-- CreateIndex
CREATE INDEX "Asset_isHidden_idx" ON "Asset"("isHidden");

-- CreateIndex
CREATE INDEX "Asset_isAvailable_idx" ON "Asset"("isAvailable");
