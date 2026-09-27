-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "document" TEXT,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "niche" TEXT,
    "status" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'PUBLIC_REGISTRY',
    "sourceExternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "state" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDigitalPresence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "website" TEXT,
    "instagram" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "googleMapsUri" TEXT,
    "opportunityScore" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyDigitalPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_document_key" ON "Company"("document");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_niche_idx" ON "Company"("niche");

-- CreateIndex
CREATE INDEX "Company_sourceExternalId_idx" ON "Company"("sourceExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLocation_companyId_key" ON "CompanyLocation"("companyId");

-- CreateIndex
CREATE INDEX "CompanyLocation_state_city_idx" ON "CompanyLocation"("state", "city");

-- CreateIndex
CREATE INDEX "CompanyLocation_city_neighborhood_idx" ON "CompanyLocation"("city", "neighborhood");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDigitalPresence_companyId_key" ON "CompanyDigitalPresence"("companyId");

-- CreateIndex
CREATE INDEX "CompanyDigitalPresence_opportunityScore_idx" ON "CompanyDigitalPresence"("opportunityScore");

-- CreateIndex
CREATE INDEX "CompanySource_companyId_field_idx" ON "CompanySource"("companyId", "field");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_nextActionAt_idx" ON "Lead"("nextActionAt");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDigitalPresence" ADD CONSTRAINT "CompanyDigitalPresence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
