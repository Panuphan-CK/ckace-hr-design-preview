-- Human readable running numbers for overtime (OT-0001), medical (MED-0001) and time correction
-- (TC-0001) requests. Additive; existing rows are numbered by the sequence. UUID stays canonical.
ALTER TABLE "overtime_requests" ADD COLUMN "requestNo" SERIAL NOT NULL;
CREATE UNIQUE INDEX "overtime_requests_requestNo_key" ON "overtime_requests"("requestNo");
ALTER TABLE "medical_claims" ADD COLUMN "requestNo" SERIAL NOT NULL;
CREATE UNIQUE INDEX "medical_claims_requestNo_key" ON "medical_claims"("requestNo");
ALTER TABLE "time_correction_requests" ADD COLUMN "requestNo" SERIAL NOT NULL;
CREATE UNIQUE INDEX "time_correction_requests_requestNo_key" ON "time_correction_requests"("requestNo");
