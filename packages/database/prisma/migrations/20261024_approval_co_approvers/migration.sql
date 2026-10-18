-- A step can have several eligible approvers (for example an Admin's own request may be
-- approved by either SuperAdmin). The primary approver stays in approverEmployeeId; the others
-- are co-approvers. Additive: existing steps get an empty list.
ALTER TABLE "approval_steps" ADD COLUMN "coApproverEmployeeIds" UUID[] DEFAULT ARRAY[]::UUID[];
