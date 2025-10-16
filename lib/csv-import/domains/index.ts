import { CSVImportDomainConfig } from "../types";
import { departmentsDomainConfig } from "./departments";
import { employeeDomainConfig } from "./employees";
import { jobRolesDomainConfig } from "./job-roles";
import { payrollDomainConfig } from "./payroll";
import { trainingDomainConfig } from "./training";
import { workingPatternsDomainConfig } from "./working-patterns";

export const CSV_IMPORT_DOMAIN_CONFIGS = {
  employees: employeeDomainConfig,
  departments: departmentsDomainConfig,
  "job-roles": jobRolesDomainConfig,
  "working-patterns": workingPatternsDomainConfig,
  payroll: payrollDomainConfig,
  training: trainingDomainConfig,
} as const satisfies Record<string, CSVImportDomainConfig>;

export type CSVImportDomainId = keyof typeof CSV_IMPORT_DOMAIN_CONFIGS;

export const getDomainConfig = (id: CSVImportDomainId): CSVImportDomainConfig => {
  return CSV_IMPORT_DOMAIN_CONFIGS[id];
};
