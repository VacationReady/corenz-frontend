UPDATE "Employee"
SET "companyId" = "User"."companyId"
FROM "User"
WHERE "User"."id" = "Employee"."userId";
