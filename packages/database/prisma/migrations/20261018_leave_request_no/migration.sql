-- Human readable running number for leave requests (displayed as LEV-0001). Additive;
-- existing rows are numbered by the sequence. The UUID remains the canonical identifier.
ALTER TABLE "leave_requests" ADD COLUMN "requestNo" SERIAL NOT NULL;
CREATE UNIQUE INDEX "leave_requests_requestNo_key" ON "leave_requests"("requestNo");
