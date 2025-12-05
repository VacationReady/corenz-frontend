import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getFieldByKey } from "@/lib/hrReportFields";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { resolveReportingTimeConfig } from "@/lib/reportingTimeConfig";
import { deserializeFilterGroup, normalizeFilterGroupInput, addRuleToGroup, createFilterRule } from "@/lib/reportFilters";
import type { FilterGroup } from "@/lib/reportFilters";
import { reportQueryCache, cachedReportQuery } from "@/lib/reportCache";

export const runtime = "nodejs";

const allowedOperators = [
	"equals","not_equals","contains","not_contains","starts_with","ends_with",
	"greater_than","less_than","greater_than_equal","less_than_equal","between",
	"is_null","is_not_null","in","not_in",
        "date_equals","date_before","date_after","date_between","date_in_last","date_in_next","date_preset",
] as const;

type Operator = typeof allowedOperators[number];

// Legacy-to-current field key mapping for backwards compatibility
const legacyFieldMap: Record<string, string> = {
    "User.department.name": "User.Department_User_departmentIdToDepartment.name",
    "User.jobRole.name": "User.JobRole.name",
};

function translateFieldKey(field: string): string {
    return legacyFieldMap[field] || field;
}

// Helper to get nested value from an object using dot path
function getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current)) current = current[0];
        return current?.[key];
    }, obj);
}

// Helper to set nested value on an object using dot path
function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
}

// Compute the data path for an original field given the primary model
function computeDataPath(originalField: string, primaryModel: string): string {
    // Skip computed fields
    if (originalField.startsWith("_computed.")) {
        return originalField;
    }
    
    // If field already starts with the primary model, strip the prefix
    if (originalField.startsWith(`${primaryModel}.`)) {
        return originalField.slice(primaryModel.length + 1);
    }
    
    // Map common patterns based on primary model
    // These mirror the anchor functions defined above
    const modelAnchorPrefixes: Record<string, string> = {
        "LeaveRequest": "LeaveRequest.",
        "LeaveEntitlement": "LeaveEntitlement.",
        "DriverLicence": "DriverLicence.",
        "EmploymentCheck": "EmploymentCheck.",
        "TrainingRecord": "TrainingRecord.",
        "EmployeeOffboarding": "EmployeeOffboarding.",
        "Timesheet": "Timesheet.",
        "TimesheetEntry": "TimesheetEntry.",
        "TimesheetApprovalDecision": "TimesheetApprovalDecision.",
    };
    
    // Determine the relationship path based on primary model
    const pathMappings: Record<string, Record<string, string>> = {
        "LeaveEntitlement": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
            "EventCategory.": "EventCategory.",
        },
        "LeaveRequest": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
            "EventCategory.": "EventCategory.",
            "LeaveEntitlement.": "Employee.LeaveEntitlement.",
        },
        "DriverLicence": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
        },
        "EmploymentCheck": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
        },
        "TrainingRecord": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
            "Course.": "Course.",
            "TrainingProvider.": "TrainingProvider.",
        },
        "EmployeeOffboarding": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
        },
        "Timesheet": {
            "User.": "Employee.User.",
            "Employee.": "Employee.",
            "Department.": "Employee.Department.",
            "JobRole.": "Employee.JobRole.",
            "WorkingPattern.": "Employee.WorkingPattern.",
        },
        "TimesheetEntry": {
            "User.": "Timesheet.Employee.User.",
            "Employee.": "Timesheet.Employee.",
            "Department.": "Timesheet.Employee.Department.",
            "JobRole.": "Timesheet.Employee.JobRole.",
            "WorkingPattern.": "Timesheet.Employee.WorkingPattern.",
            "Timesheet.": "Timesheet.",
        },
        "TimesheetApprovalDecision": {
            "User.": "Stage.Timesheet.Employee.User.",
            "Employee.": "Stage.Timesheet.Employee.",
            "Department.": "Stage.Timesheet.Employee.Department.",
            "JobRole.": "Stage.Timesheet.Employee.JobRole.",
            "WorkingPattern.": "Stage.Timesheet.Employee.WorkingPattern.",
            "Timesheet.": "Stage.Timesheet.",
        },
    };
    
    const mappings = pathMappings[primaryModel];
    if (mappings) {
        for (const [prefix, replacement] of Object.entries(mappings)) {
            if (originalField.startsWith(prefix)) {
                return originalField.replace(prefix, replacement);
            }
        }
    }
    
    // If no mapping found, return as-is (for User model or unmapped fields)
    return originalField;
}

// Transform results to map anchored paths back to original field paths
function flattenToOriginalPaths(
    results: any[],
    originalFields: string[],
    _anchoredFields: string[], // kept for potential debugging
    primaryModel: string
): any[] {
    console.log("🔄 Flattening results to original paths. Primary model:", primaryModel);
    console.log("🔄 Original fields sample:", originalFields.slice(0, 5));
    
    return results.map((row, idx) => {
        const flatRow: any = { id: row.id }; // Preserve ID
        
        // Process each unique original field
        const processedFields = new Set<string>();
        
        for (const originalField of originalFields) {
            // Skip duplicates
            if (processedFields.has(originalField)) continue;
            processedFields.add(originalField);
            
            // Handle computed fields
            if (originalField.startsWith("_computed.")) {
                if (row._computed) {
                    flatRow._computed = row._computed;
                }
                continue;
            }
            
            // Compute the data path based on the original field and primary model
            const dataPath = computeDataPath(originalField, primaryModel);
            
            // Get value from the nested data path
            const value = getNestedValue(row, dataPath);
            
            // Debug first row
            if (idx === 0) {
                console.log(`🔄 Field mapping: ${originalField} -> ${dataPath} = ${JSON.stringify(value)}`);
            }
            
            // Set value at the original field path
            setNestedValue(flatRow, originalField, value);
        }
        
        // Also preserve any _computed fields that weren't explicitly requested
        if (row._computed) {
            flatRow._computed = { ...flatRow._computed, ...row._computed };
        }
        
        return flatRow;
    });
}

// Helper to recursively translate field keys in a FilterGroup
function translateFilterGroup(group: FilterGroup): FilterGroup {
    return {
        ...group,
        children: group.children.map((child) => {
            if (child.type === "rule") {
                return {
                    ...child,
                    field: translateFieldKey(child.field),
                };
            } else {
                return translateFilterGroup(child);
            }
        }),
    };
}

// Helper to recursively rewrite fields in a FilterGroup for leave context
function rewriteFilterGroupForLeaveContext(group: FilterGroup): FilterGroup {
    return {
        ...group,
        children: group.children.map((child) => {
            if (child.type === "rule") {
                const rewrittenField = rewriteFieldsForLeaveContext([child.field])[0];
                return {
                    ...child,
                    field: rewrittenField,
                };
            } else {
                return rewriteFilterGroupForLeaveContext(child);
            }
        }),
    };
}

// When any LeaveRequest field is present, rewrite generic User/EventCategory selections
// to their leave-anchored equivalents so the primary model can remain LeaveRequest.
function anchorFieldToLeave(field: string): string {
    if (field === "LeaveEntitlement.usedDays") return "_computed.durationDays";
    if (field.startsWith("LeaveEntitlement.")) return field.replace("LeaveEntitlement.", "LeaveRequest.Employee.LeaveEntitlement.");
    if (field.startsWith("User.")) return field.replace("User.", "LeaveRequest.Employee.User.");
    if (field.startsWith("Employee.")) return field.replace("Employee.", "LeaveRequest.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "LeaveRequest.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "LeaveRequest.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "LeaveRequest.Employee.WorkingPattern.");
    if (field.startsWith("EventCategory.")) return field.replace("EventCategory.", "LeaveRequest.EventCategory.");
    return field;
}

// When any DriverLicence field is present, anchor other fields to DriverLicence
function anchorFieldToDriverLicence(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "DriverLicence.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("DriverLicence.Employee.")) return field.replace("Employee.", "DriverLicence.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "DriverLicence.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "DriverLicence.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "DriverLicence.Employee.WorkingPattern.");
    return field;
}

// When any EmploymentCheck field is present, anchor other fields to EmploymentCheck
function anchorFieldToEmploymentCheck(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "EmploymentCheck.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("EmploymentCheck.Employee.")) return field.replace("Employee.", "EmploymentCheck.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "EmploymentCheck.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "EmploymentCheck.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "EmploymentCheck.Employee.WorkingPattern.");
    return field;
}

// When any TrainingRecord field is present, anchor other fields to TrainingRecord
function anchorFieldToTrainingRecord(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "TrainingRecord.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("TrainingRecord.Employee.")) return field.replace("Employee.", "TrainingRecord.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "TrainingRecord.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "TrainingRecord.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "TrainingRecord.Employee.WorkingPattern.");
    // Anchor Course and TrainingProvider to TrainingRecord context
    if (field.startsWith("Course.") && !field.startsWith("TrainingRecord.Course.")) return field.replace("Course.", "TrainingRecord.Course.");
    if (field.startsWith("TrainingProvider.") && !field.startsWith("TrainingRecord.TrainingProvider.")) return field.replace("TrainingProvider.", "TrainingRecord.TrainingProvider.");
    return field;
}

// When any EmployeeOffboarding field is present, anchor other fields to EmployeeOffboarding
function anchorFieldToEmployeeOffboarding(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "EmployeeOffboarding.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("EmployeeOffboarding.Employee.")) return field.replace("Employee.", "EmployeeOffboarding.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "EmployeeOffboarding.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "EmployeeOffboarding.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "EmployeeOffboarding.Employee.WorkingPattern.");
    return field;
}

// When LeaveEntitlement fields are present (without LeaveRequest), anchor other fields to LeaveEntitlement
function anchorFieldToLeaveEntitlement(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "LeaveEntitlement.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("LeaveEntitlement.Employee.")) return field.replace("Employee.", "LeaveEntitlement.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "LeaveEntitlement.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "LeaveEntitlement.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "LeaveEntitlement.Employee.WorkingPattern.");
    if (field.startsWith("EventCategory.") && !field.startsWith("LeaveEntitlement.EventCategory.")) return field.replace("EventCategory.", "LeaveEntitlement.EventCategory.");
    return field;
}

// When any Timesheet field is present, anchor other fields to Timesheet
function anchorFieldToTimesheet(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "Timesheet.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("Timesheet.Employee.")) return field.replace("Employee.", "Timesheet.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "Timesheet.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "Timesheet.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "Timesheet.Employee.WorkingPattern.");
    return field;
}

// When any TimesheetEntry field is present, anchor other fields to TimesheetEntry
function anchorFieldToTimesheetEntry(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "TimesheetEntry.Timesheet.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("TimesheetEntry.Timesheet.Employee.")) return field.replace("Employee.", "TimesheetEntry.Timesheet.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "TimesheetEntry.Timesheet.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "TimesheetEntry.Timesheet.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "TimesheetEntry.Timesheet.Employee.WorkingPattern.");
    if (field.startsWith("Timesheet.") && !field.startsWith("TimesheetEntry.Timesheet.")) return field.replace("Timesheet.", "TimesheetEntry.Timesheet.");
    return field;
}

// When any TimesheetApprovalDecision field is present, anchor other fields to TimesheetApprovalDecision
function anchorFieldToTimesheetApprovalDecision(field: string): string {
    if (field.startsWith("User.")) return field.replace("User.", "TimesheetApprovalDecision.Stage.Timesheet.Employee.User.");
    if (field.startsWith("Employee.") && !field.startsWith("TimesheetApprovalDecision.Stage.Timesheet.Employee.")) return field.replace("Employee.", "TimesheetApprovalDecision.Stage.Timesheet.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "TimesheetApprovalDecision.Stage.Timesheet.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "TimesheetApprovalDecision.Stage.Timesheet.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "TimesheetApprovalDecision.Stage.Timesheet.Employee.WorkingPattern.");
    if (field.startsWith("Timesheet.") && !field.startsWith("TimesheetApprovalDecision.Stage.Timesheet.")) return field.replace("Timesheet.", "TimesheetApprovalDecision.Stage.Timesheet.");
    return field;
}

function rewriteFieldsForLeaveContext(fields: string[]): string[] {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    const hasLeaveEntitlement = fields.some((f) => f.startsWith("LeaveEntitlement."));
    const hasDriverLicence = fields.some((f) => f.startsWith("DriverLicence."));
    const hasEmploymentCheck = fields.some((f) => f.startsWith("EmploymentCheck."));
    const hasTrainingRecord = fields.some((f) => f.startsWith("TrainingRecord."));
    const hasEmployeeOffboarding = fields.some((f) => f.startsWith("EmployeeOffboarding."));
    const hasTimesheet = fields.some((f) => f.startsWith("Timesheet."));
    const hasTimesheetEntry = fields.some((f) => f.startsWith("TimesheetEntry."));
    const hasTimesheetApprovalDecision = fields.some((f) => f.startsWith("TimesheetApprovalDecision."));
    const anchorToUserRoot =
        !hasLeave && !hasLeaveEntitlement && !hasDriverLicence && !hasEmploymentCheck && !hasTrainingRecord && !hasEmployeeOffboarding && !hasTimesheet && !hasTimesheetEntry && !hasTimesheetApprovalDecision;
    const result: string[] = [];
    for (const f of fields) {
        let maybeAnchored = f;
        // Priority: LeaveRequest > LeaveEntitlement > DriverLicence > EmploymentCheck > TrainingRecord > EmployeeOffboarding > TimesheetApprovalDecision > TimesheetEntry > Timesheet
        if (hasLeave) {
            maybeAnchored = anchorFieldToLeave(f);
        } else if (hasLeaveEntitlement) {
            maybeAnchored = anchorFieldToLeaveEntitlement(f);
        } else if (hasDriverLicence) {
            maybeAnchored = anchorFieldToDriverLicence(f);
        } else if (hasEmploymentCheck) {
            maybeAnchored = anchorFieldToEmploymentCheck(f);
        } else if (hasTrainingRecord) {
            maybeAnchored = anchorFieldToTrainingRecord(f);
        } else if (hasEmployeeOffboarding) {
            maybeAnchored = anchorFieldToEmployeeOffboarding(f);
        } else if (hasTimesheetApprovalDecision) {
            maybeAnchored = anchorFieldToTimesheetApprovalDecision(f);
        } else if (hasTimesheetEntry) {
            maybeAnchored = anchorFieldToTimesheetEntry(f);
        } else if (hasTimesheet) {
            maybeAnchored = anchorFieldToTimesheet(f);
        }
        // Always normalize Job Role into a single computed field, independent of context
        if (
            f === "User.JobRole.name" ||
            f === "Employee.JobRole.name" ||
            maybeAnchored === "LeaveRequest.Employee.User.JobRole.name" ||
            maybeAnchored === "LeaveRequest.Employee.JobRole.name" ||
            maybeAnchored === "LeaveEntitlement.Employee.User.JobRole.name" ||
            maybeAnchored === "LeaveEntitlement.Employee.JobRole.name" ||
            maybeAnchored === "DriverLicence.Employee.User.JobRole.name" ||
            maybeAnchored === "DriverLicence.Employee.JobRole.name" ||
            maybeAnchored === "EmploymentCheck.Employee.User.JobRole.name" ||
            maybeAnchored === "EmploymentCheck.Employee.JobRole.name" ||
            maybeAnchored === "TrainingRecord.Employee.User.JobRole.name" ||
            maybeAnchored === "TrainingRecord.Employee.JobRole.name" ||
            maybeAnchored === "EmployeeOffboarding.Employee.User.JobRole.name" ||
            maybeAnchored === "EmployeeOffboarding.Employee.JobRole.name" ||
            maybeAnchored === "Timesheet.Employee.User.JobRole.name" ||
            maybeAnchored === "Timesheet.Employee.JobRole.name" ||
            maybeAnchored === "TimesheetEntry.Timesheet.Employee.User.JobRole.name" ||
            maybeAnchored === "TimesheetEntry.Timesheet.Employee.JobRole.name" ||
            maybeAnchored === "TimesheetApprovalDecision.Stage.Timesheet.Employee.User.JobRole.name" ||
            maybeAnchored === "TimesheetApprovalDecision.Stage.Timesheet.Employee.JobRole.name"
        ) {
            // Include both source paths so the computed can resolve, plus the computed field
            let userPath = "User.JobRole.name";
            let employeePath = anchorToUserRoot ? "User.Employee.JobRole.name" : "Employee.JobRole.name";
            if (hasLeave) {
                userPath = "LeaveRequest.Employee.User.JobRole.name";
                employeePath = "LeaveRequest.Employee.JobRole.name";
            } else if (hasLeaveEntitlement) {
                userPath = "LeaveEntitlement.Employee.User.JobRole.name";
                employeePath = "LeaveEntitlement.Employee.JobRole.name";
            } else if (hasDriverLicence) {
                userPath = "DriverLicence.Employee.User.JobRole.name";
                employeePath = "DriverLicence.Employee.JobRole.name";
            } else if (hasEmploymentCheck) {
                userPath = "EmploymentCheck.Employee.User.JobRole.name";
                employeePath = "EmploymentCheck.Employee.JobRole.name";
            } else if (hasTrainingRecord) {
                userPath = "TrainingRecord.Employee.User.JobRole.name";
                employeePath = "TrainingRecord.Employee.JobRole.name";
            } else if (hasEmployeeOffboarding) {
                userPath = "EmployeeOffboarding.Employee.User.JobRole.name";
                employeePath = "EmployeeOffboarding.Employee.JobRole.name";
            } else if (hasTimesheetApprovalDecision) {
                userPath = "TimesheetApprovalDecision.Stage.Timesheet.Employee.User.JobRole.name";
                employeePath = "TimesheetApprovalDecision.Stage.Timesheet.Employee.JobRole.name";
            } else if (hasTimesheetEntry) {
                userPath = "TimesheetEntry.Timesheet.Employee.User.JobRole.name";
                employeePath = "TimesheetEntry.Timesheet.Employee.JobRole.name";
            } else if (hasTimesheet) {
                userPath = "Timesheet.Employee.User.JobRole.name";
                employeePath = "Timesheet.Employee.JobRole.name";
            }
            if (!result.includes(userPath)) result.push(userPath);
            if (!result.includes(employeePath)) result.push(employeePath);
            if (!result.includes("_computed.jobRoleName")) result.push("_computed.jobRoleName");
            continue;
        }

        if (
            f === "User.Department_User_departmentIdToDepartment.name" ||
            f === "User.department.name" ||
            f === "Department.name" ||
            maybeAnchored === "LeaveRequest.Employee.Department.name" ||
            maybeAnchored === "LeaveEntitlement.Employee.Department.name" ||
            maybeAnchored === "DriverLicence.Employee.Department.name" ||
            maybeAnchored === "EmploymentCheck.Employee.Department.name" ||
            maybeAnchored === "TrainingRecord.Employee.Department.name" ||
            maybeAnchored === "EmployeeOffboarding.Employee.Department.name" ||
            maybeAnchored === "Timesheet.Employee.Department.name" ||
            maybeAnchored === "TimesheetEntry.Timesheet.Employee.Department.name" ||
            maybeAnchored === "TimesheetApprovalDecision.Stage.Timesheet.Employee.Department.name"
        ) {
            if (hasLeave) {
                const deptPath = "LeaveRequest.Employee.Department.name";
                const userDeptPath = "LeaveRequest.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasLeaveEntitlement) {
                const deptPath = "LeaveEntitlement.Employee.Department.name";
                const userDeptPath = "LeaveEntitlement.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasDriverLicence) {
                const deptPath = "DriverLicence.Employee.Department.name";
                const userDeptPath = "DriverLicence.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasEmploymentCheck) {
                const deptPath = "EmploymentCheck.Employee.Department.name";
                const userDeptPath = "EmploymentCheck.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasTrainingRecord) {
                const deptPath = "TrainingRecord.Employee.Department.name";
                const userDeptPath = "TrainingRecord.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasEmployeeOffboarding) {
                const deptPath = "EmployeeOffboarding.Employee.Department.name";
                const userDeptPath = "EmployeeOffboarding.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasTimesheetApprovalDecision) {
                const deptPath = "TimesheetApprovalDecision.Stage.Timesheet.Employee.Department.name";
                const userDeptPath = "TimesheetApprovalDecision.Stage.Timesheet.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasTimesheetEntry) {
                const deptPath = "TimesheetEntry.Timesheet.Employee.Department.name";
                const userDeptPath = "TimesheetEntry.Timesheet.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else if (hasTimesheet) {
                const deptPath = "Timesheet.Employee.Department.name";
                const userDeptPath = "Timesheet.Employee.User.Department_User_departmentIdToDepartment.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(deptPath)) result.push(deptPath);
            } else {
                const userDeptPath = "User.Department_User_departmentIdToDepartment.name";
                const employeeDeptPath = "User.Employee.Department.name";
                if (!result.includes(userDeptPath)) result.push(userDeptPath);
                if (!result.includes(employeeDeptPath)) result.push(employeeDeptPath);
            }
            continue;
        }
        if (anchorToUserRoot) {
            if (f.startsWith("Employee.")) {
                const anchored = `User.${f}`;
                if (!result.includes(anchored)) result.push(anchored);
                continue;
            }
            if (f.startsWith("Department.")) {
                const anchored = `User.Employee.${f}`;
                if (!result.includes(anchored)) result.push(anchored);
                continue;
            }
            if (f.startsWith("WorkingPattern.")) {
                const anchored = `User.Employee.${f}`;
                if (!result.includes(anchored)) result.push(anchored);
                continue;
            }
        }
        // Ensure Working Pattern name is resolvable when requested via model alias
        if (
            f === "WorkingPattern.name" ||
            maybeAnchored === "LeaveRequest.Employee.WorkingPattern.name" ||
            maybeAnchored === "DriverLicence.Employee.WorkingPattern.name" ||
            maybeAnchored === "EmploymentCheck.Employee.WorkingPattern.name" ||
            maybeAnchored === "TrainingRecord.Employee.WorkingPattern.name" ||
            maybeAnchored === "EmployeeOffboarding.Employee.WorkingPattern.name" ||
            maybeAnchored === "Timesheet.Employee.WorkingPattern.name" ||
            maybeAnchored === "TimesheetEntry.Timesheet.Employee.WorkingPattern.name" ||
            maybeAnchored === "TimesheetApprovalDecision.Stage.Timesheet.Employee.WorkingPattern.name"
        ) {
            let wpPath = "WorkingPattern.name";
            if (hasLeave) {
                wpPath = "LeaveRequest.Employee.WorkingPattern.name";
            } else if (hasDriverLicence) {
                wpPath = "DriverLicence.Employee.WorkingPattern.name";
            } else if (hasEmploymentCheck) {
                wpPath = "EmploymentCheck.Employee.WorkingPattern.name";
            } else if (hasTrainingRecord) {
                wpPath = "TrainingRecord.Employee.WorkingPattern.name";
            } else if (hasEmployeeOffboarding) {
                wpPath = "EmployeeOffboarding.Employee.WorkingPattern.name";
            } else if (hasTimesheetApprovalDecision) {
                wpPath = "TimesheetApprovalDecision.Stage.Timesheet.Employee.WorkingPattern.name";
            } else if (hasTimesheetEntry) {
                wpPath = "TimesheetEntry.Timesheet.Employee.WorkingPattern.name";
            } else if (hasTimesheet) {
                wpPath = "Timesheet.Employee.WorkingPattern.name";
            }
            if (!result.includes(wpPath)) result.push(wpPath);
            continue;
        }
        result.push(maybeAnchored);
    }
    return result;
}

const filterSchema = z
	.object({
		field: z.string().trim().min(1, "Filter field is required"),
		operator: z.enum(allowedOperators),
		value: z.any().optional(),
		value2: z.any().optional(),
	})
	.passthrough();

const paginationSchema = z
	.object({
		limit: z.number().int().positive().optional(),
		page: z.number().int().positive().optional(),
	})
	.optional();

const sortSchema = z
	.object({
		field: z.string().trim().min(1, "Sort field is required"),
		direction: z.enum(["asc", "desc"]).optional(),
	})
	.passthrough()
	.optional();

const reportQuerySchema = z.object({
	selectedFields: z
		.array(z.string().trim().min(1, "Field name is required"))
		.min(1, "At least one field must be selected"),
	filters: z.array(filterSchema).optional(), // Legacy support
	filterGroup: z.any().optional(), // New grouped filter format
	pagination: paginationSchema,
	sort: sortSchema,
});

export async function POST(req: Request) {
	try {
    await ensurePrismaConnected();
		const session = await getServerSession(authOptions);
		if (!session?.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

        const parsedBody = reportQuerySchema.parse(await req.json());
        const { 
                selectedFields: requestedFields, 
                filters, 
                filterGroup: rawFilterGroup,
                pagination, 
                sort 
        } = parsedBody;

        // Normalize filters: prefer filterGroup, fallback to legacy filters array
        let normalizedFilterGroup: FilterGroup;
        if (rawFilterGroup) {
                normalizedFilterGroup = deserializeFilterGroup(rawFilterGroup);
        } else if (filters && filters.length > 0) {
                // Convert legacy flat filters to FilterGroup (ensure required props)
                const legacyFilters = filters.map((filter, index) => ({
                        id: (filter as any)?.id ?? `legacy_filter_${index}`,
                        field: filter.field,
                        operator: filter.operator,
                        value: filter.value,
                        value2: filter.value2,
                        hideFieldInResults: (filter as any)?.hideFieldInResults ?? false,
                        type: "rule" as const,
                }));
                normalizedFilterGroup = normalizeFilterGroupInput(legacyFilters);
        } else {
                normalizedFilterGroup = normalizeFilterGroupInput(undefined);
        }

		const companyId = session.user.companyId;

        // Expand computed field dependencies before any translation
        const initialFieldSet = new Set<string>(requestedFields as string[]);
        for (const fieldKey of initialFieldSet) {
            const definition = getFieldByKey(fieldKey);
            if (definition?.dependsOn) {
                for (const dependency of definition.dependsOn) {
                    if (typeof dependency === "string" && dependency.trim().length > 0) {
                        initialFieldSet.add(dependency);
                    }
                }
            }
        }
        const selectedFields = Array.from(initialFieldSet);

        // Translate legacy keys first
        let translatedSelectedFields = (selectedFields as string[]).map(translateFieldKey);
        let translatedFilterGroup = translateFilterGroup(normalizedFilterGroup);
        let translatedSort = sort?.field ? { ...sort, field: translateFieldKey(sort.field) } : sort;

        // Store fields BEFORE anchoring (these are what frontend expects)
        const fieldsBeforeAnchoring = [...translatedSelectedFields];
        console.log("🔍 Fields BEFORE anchoring:", fieldsBeforeAnchoring);

        // Rewrite to leave-anchored equivalents if applicable (includes LeaveEntitlement -> LeaveRequest.Employee.LeaveEntitlement)
        translatedSelectedFields = rewriteFieldsForLeaveContext(translatedSelectedFields);
        translatedFilterGroup = rewriteFilterGroupForLeaveContext(translatedFilterGroup);
        
        // Store fields AFTER anchoring (these are the data paths)
        const fieldsAfterAnchoring = [...translatedSelectedFields];
        console.log("🔍 Fields AFTER anchoring:", fieldsAfterAnchoring);
        
        // Rewrite sort field using context from selected fields (not just the sort field alone)
        if (translatedSort?.field) {
            // Detect context from the already-rewritten selected fields
            const hasLeave = translatedSelectedFields.some((f) => f.startsWith("LeaveRequest."));
            const hasLeaveEntitlement = translatedSelectedFields.some((f) => f.startsWith("LeaveEntitlement."));
            const hasDriverLicence = translatedSelectedFields.some((f) => f.startsWith("DriverLicence."));
            const hasEmploymentCheck = translatedSelectedFields.some((f) => f.startsWith("EmploymentCheck."));
            const hasTrainingRecord = translatedSelectedFields.some((f) => f.startsWith("TrainingRecord."));
            const hasEmployeeOffboarding = translatedSelectedFields.some((f) => f.startsWith("EmployeeOffboarding."));
            const hasTimesheet = translatedSelectedFields.some((f) => f.startsWith("Timesheet.") && !f.startsWith("TimesheetEntry.") && !f.startsWith("TimesheetApprovalDecision."));
            const hasTimesheetEntry = translatedSelectedFields.some((f) => f.startsWith("TimesheetEntry."));
            const hasTimesheetApprovalDecision = translatedSelectedFields.some((f) => f.startsWith("TimesheetApprovalDecision."));
            
            let sortField = translatedSort.field;
            // Apply the appropriate anchor function based on detected context
            if (hasLeave) {
                sortField = anchorFieldToLeave(sortField);
            } else if (hasLeaveEntitlement) {
                sortField = anchorFieldToLeaveEntitlement(sortField);
            } else if (hasDriverLicence) {
                sortField = anchorFieldToDriverLicence(sortField);
            } else if (hasEmploymentCheck) {
                sortField = anchorFieldToEmploymentCheck(sortField);
            } else if (hasTrainingRecord) {
                sortField = anchorFieldToTrainingRecord(sortField);
            } else if (hasEmployeeOffboarding) {
                sortField = anchorFieldToEmployeeOffboarding(sortField);
            } else if (hasTimesheetApprovalDecision) {
                sortField = anchorFieldToTimesheetApprovalDecision(sortField);
            } else if (hasTimesheetEntry) {
                sortField = anchorFieldToTimesheetEntry(sortField);
            } else if (hasTimesheet) {
                sortField = anchorFieldToTimesheet(sortField);
            }
            translatedSort = { ...translatedSort, field: sortField } as any;
        }

        // Do not restrict fields by an allowlist; accept all translated selections
        let sanitizedSelectedFields = Array.from(new Set(translatedSelectedFields));

        // If Working Pattern name is requested in any alias, include computed fallback
        if (
          sanitizedSelectedFields.includes("WorkingPattern.name") ||
          sanitizedSelectedFields.includes("Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("User.Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("LeaveRequest.Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("DriverLicence.Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("EmploymentCheck.Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("TrainingRecord.Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("EmployeeOffboarding.Employee.WorkingPattern.name")
        ) {
          if (!sanitizedSelectedFields.includes("_computed.workingPatternName")) {
            sanitizedSelectedFields.push("_computed.workingPatternName");
          }
          // Also include latest assignment relation for fallback resolution
          const needsEmployee = sanitizedSelectedFields.some((f) => f.startsWith("Employee.") || f.startsWith("User.Employee."));
          const needsLeave = sanitizedSelectedFields.some((f) => f.startsWith("LeaveRequest."));
          const needsDriverLicence = sanitizedSelectedFields.some((f) => f.startsWith("DriverLicence."));
          const needsEmploymentCheck = sanitizedSelectedFields.some((f) => f.startsWith("EmploymentCheck."));
          const needsTrainingRecord = sanitizedSelectedFields.some((f) => f.startsWith("TrainingRecord."));
          const needsEmployeeOffboarding = sanitizedSelectedFields.some((f) => f.startsWith("EmployeeOffboarding."));
          if (needsLeave) {
            // Ensure nested include contains assignments and WP under LeaveRequest.Employee
            sanitizedSelectedFields.push("LeaveRequest.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("LeaveRequest.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsDriverLicence) {
            // Ensure nested include contains assignments and WP under DriverLicence.Employee
            sanitizedSelectedFields.push("DriverLicence.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("DriverLicence.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmploymentCheck) {
            // Ensure nested include contains assignments and WP under EmploymentCheck.Employee
            sanitizedSelectedFields.push("EmploymentCheck.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("EmploymentCheck.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsTrainingRecord) {
            // Ensure nested include contains assignments and WP under TrainingRecord.Employee
            sanitizedSelectedFields.push("TrainingRecord.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("TrainingRecord.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmployeeOffboarding) {
            // Ensure nested include contains assignments and WP under EmployeeOffboarding.Employee
            sanitizedSelectedFields.push("EmployeeOffboarding.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("EmployeeOffboarding.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmployee || sanitizedSelectedFields.some((f) => f.startsWith("User."))) {
            sanitizedSelectedFields.push("Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          }
        }

        // If Employee.startDate is requested, include computed earliest assignment date as fallback
        if (sanitizedSelectedFields.includes("Employee.startDate") || 
            sanitizedSelectedFields.includes("User.Employee.startDate") ||
            sanitizedSelectedFields.includes("DriverLicence.Employee.startDate") ||
            sanitizedSelectedFields.includes("EmploymentCheck.Employee.startDate") ||
            sanitizedSelectedFields.includes("TrainingRecord.Employee.startDate") ||
            sanitizedSelectedFields.includes("EmployeeOffboarding.Employee.startDate")) {
          if (!sanitizedSelectedFields.includes("_computed.effectiveStartDate")) {
            sanitizedSelectedFields.push("_computed.effectiveStartDate");
          }
          // Ensure assignments are included to compute fallback
          const needsLeave = sanitizedSelectedFields.some((f) => f.startsWith("LeaveRequest."));
          const needsDriverLicence = sanitizedSelectedFields.some((f) => f.startsWith("DriverLicence."));
          const needsEmploymentCheck = sanitizedSelectedFields.some((f) => f.startsWith("EmploymentCheck."));
          const needsTrainingRecord = sanitizedSelectedFields.some((f) => f.startsWith("TrainingRecord."));
          const needsEmployeeOffboarding = sanitizedSelectedFields.some((f) => f.startsWith("EmployeeOffboarding."));
          if (needsLeave) {
            sanitizedSelectedFields.push("LeaveRequest.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsDriverLicence) {
            sanitizedSelectedFields.push("DriverLicence.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmploymentCheck) {
            sanitizedSelectedFields.push("EmploymentCheck.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsTrainingRecord) {
            sanitizedSelectedFields.push("TrainingRecord.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmployeeOffboarding) {
            sanitizedSelectedFields.push("EmployeeOffboarding.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (sanitizedSelectedFields.some((f) => f.startsWith("Employee.") || f.startsWith("User.Employee."))) {
            sanitizedSelectedFields.push("Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          }
        }

        // If computed approvedByFullName is requested for Timesheet, include the approver User relation
        if (sanitizedSelectedFields.includes("_computed.approvedByFullName")) {
          if (!sanitizedSelectedFields.includes("Timesheet.Approver.User.firstName")) {
            sanitizedSelectedFields.push("Timesheet.Approver.User.firstName");
          }
          if (!sanitizedSelectedFields.includes("Timesheet.Approver.User.lastName")) {
            sanitizedSelectedFields.push("Timesheet.Approver.User.lastName");
          }
        }

		if (sanitizedSelectedFields.length === 0) {
			return NextResponse.json(
				{ status: "error", message: "No valid fields selected", data: [] },
				{ status: 400 },
			);
		}

                // Enforce tenant boundaries across every model exposed through the reporting API.
		const tenantCompanyId = session.user.companyId;
                const tenantScopedFilters = [
                        { field: "User.companyId" },
                        { field: "Employee.companyId" },
                        { field: "Department.companyId" },
                        { field: "JobRole.companyId" },
                        { field: "LeaveRequest.companyId" },
                        { field: "LeaveEntitlement.companyId" },
                        { field: "EventCategory.companyId" },
                        { field: "EventSubcategory.companyId" },
                        { field: "Document.companyId" },
                        { field: "SavedReport.companyId" },
                        { field: "WorkingPattern.companyId" },
                        { field: "GenderOption.companyId" },
                        { field: "Course.companyId", operator: "in", includeNull: true },
                        { field: "TrainingProvider.companyId", operator: "in", includeNull: true },
                        { field: "TrainingRecord.Employee.companyId" },
                        { field: "EmploymentCheck.Employee.companyId" },
                        { field: "DriverLicence.Employee.companyId" },
                        { field: "EmployeeOffboarding.Employee.companyId" },
                        { field: "Timesheet.companyId" },
                        { field: "Timesheet.Employee.companyId" },
                        { field: "TimesheetEntry.Timesheet.Employee.companyId" },
                        { field: "TimesheetApprovalDecision.Stage.Timesheet.Employee.companyId" },
                ] satisfies Array<{
                        field: string;
                        operator?: Operator;
                        includeNull?: boolean;
                }>;

                // Add tenant-scoped filters to the FilterGroup
                let enforcedFilterGroup = translatedFilterGroup;
                for (const { field, operator = "equals", includeNull } of tenantScopedFilters) {
                        const value = operator === "in"
                                ? includeNull
                                        ? [tenantCompanyId, null]
                                        : [tenantCompanyId]
                                : tenantCompanyId;
                        const tenantRule = createFilterRule({
                                field,
                                operator: operator as any,
                                value,
                                hideFieldInResults: true,
                        });
                        enforcedFilterGroup = addRuleToGroup(enforcedFilterGroup, enforcedFilterGroup.id, tenantRule);
                }

                const timeConfig = await resolveReportingTimeConfig(session.user.id, companyId);

        // Build and execute the constrained query with caching
                const { queries } = buildDynamicQuery({
                        selectedFields: sanitizedSelectedFields,
                        filters: enforcedFilterGroup,
                        pagination,
                        sort: translatedSort,
                }, { timeZone: timeConfig.timeZone });

                if (queries.length === 0) {
                        return NextResponse.json({ status: "success", message: "No data", data: [], total: 0 });
                }

                // Single primary dataset
                const primary = queries[0];
                const model = primary.model as keyof typeof prisma;

                // Generate cache key for this specific query
                const cacheParams = {
                        selectedFields: sanitizedSelectedFields,
                        filters: enforcedFilterGroup,
                        pagination,
                        sort: translatedSort?.field 
                                ? { field: translatedSort.field, direction: translatedSort.direction ?? "asc" }
                                : null,
                        companyId,
                };

                console.log("🔍 Executing Prisma query for model:", model);
                console.log("🔍 Session companyId:", companyId);
                console.log("🔍 Selected fields:", sanitizedSelectedFields);
                console.log("🔍 Enforced filter group children count:", enforcedFilterGroup.children.length);
                console.log("🔍 Prisma query:", JSON.stringify(primary.prismaQuery, null, 2));

                // Use caching for query results
                const { data: queryResult, cached, responseTimeMs } = await cachedReportQuery<{ results: any[]; total: number }>(
                        cacheParams,
                        async () => {
                                console.log("🔍 Cache miss - executing database query");
                                const countArgs = primary.prismaQuery.where
                                        ? { where: primary.prismaQuery.where }
                                        : {};

                                // @ts-ignore dynamic access
                                const total = await (prisma[model] as any).count(countArgs);
                                console.log("🔍 Count result:", total);
                                // @ts-ignore dynamic access
                                let results = await (prisma[model] as any).findMany(primary.prismaQuery);
                                console.log("🔍 Query returned", results.length, "results");
                                if (results.length > 0) {
                                        console.log("🔍 Sample raw result structure:", JSON.stringify(results[0], null, 2).substring(0, 1000));
                                }
                                results = await attachComputedFields(results, sanitizedSelectedFields, primary.model);
                                
                                return { results, total };
                        }
                );

                console.log("✅ Query completed successfully, returning response");

                // Transform results to map anchored paths back to original field paths
                // This ensures the frontend can access data at the paths it expects
                const transformedResults = flattenToOriginalPaths(
                        queryResult.results,
                        fieldsBeforeAnchoring,
                        fieldsAfterAnchoring,
                        model
                );

                // Add cache headers for debugging/monitoring
                const headers = new Headers();
                headers.set("X-Cache-Status", cached ? "HIT" : "MISS");
                headers.set("X-Response-Time", `${responseTimeMs}ms`);
                headers.set("X-Cache-Hit-Rate", `${reportQueryCache.getHitRate()}%`);

                return NextResponse.json({
                        status: "success",
                        message: "Report generated successfully",
                        data: transformedResults,
                        total: queryResult.total,
                        _meta: {
                                cached,
                                responseTimeMs,
                                cacheHitRate: reportQueryCache.getHitRate(),
                        },
                }, { headers });
	} catch (error: any) {
		console.error("🔥 Error in report query API:", error);
		if (error instanceof z.ZodError) {
                        return NextResponse.json(
                                {
                                        status: "error",
                                        message: "Invalid request body",
                                        details: error.flatten(),
                                        data: [],
                                        total: 0,
                                },
                                { status: 400 },
                        );
                }
                return NextResponse.json(
                        { status: "error", message: error?.message || "Internal server error", data: [], total: 0 },
                        { status: 500 },
                );
        }
}

