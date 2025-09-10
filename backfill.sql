UPDATE "Employee"
SET "companyId" = "User"."companyId"
FROM "User"
WHERE "User"."id" = "Employee"."userId";

-- Backfill EventCategory companyId using related records
UPDATE "EventCategory" ec
SET "companyId" = er."companyId"
FROM "EventRule" er
WHERE er."eventCategoryId" = ec."id" AND ec."companyId" IS NULL;

UPDATE "EventCategory" ec
SET "companyId" = e."companyId"
FROM "LeaveEntitlement" le
JOIN "Employee" e ON le."employeeId" = e."id"
WHERE le."eventCategoryId" = ec."id" AND ec."companyId" IS NULL;

UPDATE "EventCategory" ec
SET "companyId" = e."companyId"
FROM "LeaveRequest" lr
JOIN "Employee" e ON lr."employeeId" = e."id"
WHERE lr."eventCategoryId" = ec."id" AND ec."companyId" IS NULL;

-- Propagate EventCategory companyId to EventSubcategory
UPDATE "EventSubcategory" esc
SET "companyId" = ec."companyId"
FROM "EventCategory" ec
WHERE esc."eventCategoryId" = ec."id";

-- Backfill companyId for LeaveEntitlement and LeaveRequest from Employee
UPDATE "LeaveEntitlement" le
SET "companyId" = e."companyId"
FROM "Employee" e
WHERE le."employeeId" = e."id";

UPDATE "LeaveRequest" lr
SET "companyId" = e."companyId"
FROM "Employee" e
WHERE lr."employeeId" = e."id";
