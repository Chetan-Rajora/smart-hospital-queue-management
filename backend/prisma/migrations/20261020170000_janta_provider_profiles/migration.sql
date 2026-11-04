-- Add configurable provider/service details without changing existing records.
CREATE TYPE "ServiceMode" AS ENUM ('CONSULTATION', 'DIAGNOSTIC');

ALTER TABLE "Doctor"
  ADD COLUMN "qualifications" TEXT,
  ADD COLUMN "serviceMode" "ServiceMode" NOT NULL DEFAULT 'CONSULTATION';
