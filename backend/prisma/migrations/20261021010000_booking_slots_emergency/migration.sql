-- Add fixed appointment slots and a reviewed emergency-request workflow.
-- Existing appointments and queue records are retained and receive safe defaults.
CREATE TYPE "AppointmentSlot" AS ENUM ('MORNING', 'AFTERNOON');
CREATE TYPE "BookingType" AS ENUM ('NORMAL', 'EMERGENCY');
CREATE TYPE "EmergencyStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'DECLINED');

ALTER TABLE "Appointment"
  ADD COLUMN "slot" "AppointmentSlot",
  ADD COLUMN "bookingType" "BookingType" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "emergencyStatus" "EmergencyStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "surchargeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emergencyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "emergencyReviewedById" INTEGER;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_emergencyReviewedById_fkey"
  FOREIGN KEY ("emergencyReviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_doctorId_appointmentDate_slot_idx"
  ON "Appointment"("doctorId", "appointmentDate", "slot");
CREATE INDEX "Appointment_emergencyStatus_idx"
  ON "Appointment"("emergencyStatus");

CREATE TABLE "QueueSequence" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "appointmentDate" DATE NOT NULL,
  "slot" "AppointmentSlot" NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QueueSequence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QueueSequence"
  ADD CONSTRAINT "QueueSequence_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "QueueSequence_doctorId_appointmentDate_slot_key"
  ON "QueueSequence"("doctorId", "appointmentDate", "slot");
