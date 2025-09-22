// lib/computedHandlers.ts

type ComputedFieldHandler = (item: any) => any;

type ComputedFieldRegistry = {
  [model: string]: {
    [field: string]: ComputedFieldHandler;
  };
};

export const computedHandlers: ComputedFieldRegistry = {
  // ===========================
  // Leave Entitlement
  // ===========================
  LeaveEntitlement: {
    "_computed.remainingEntitlement": (item) => {
      const total =
        (item.totalDays || 0) +
        (item.daysAllocated || 0) +
        (item.carryoverDays || 0);
      return total - (item.usedDays || 0);
    },
  },

  // ===========================
  // Leave Request
  // ===========================
  LeaveRequest: {
    "_computed.durationDays": (item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return (
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1
      );
    },
    "_computed.jobRoleName": (item) => {
      // Prefer JobRole via Employee, fallback to User.JobRole
      const viaEmployee = item?.Employee?.JobRole?.name;
      const viaUser = item?.Employee?.User?.JobRole?.name;
      return viaEmployee || viaUser || null;
    },
  },

  // ===========================
  // Driver Licence
  // ===========================
  DriverLicence: {
    "_computed.daysUntilExpiry": (item) => {
      const expiry = new Date(item.expiryDate);
      const today = new Date();
      return Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    },
  },

  // ===========================
  // Training Record
  // ===========================
  TrainingRecord: {
    "_computed.daysUntilExpiry": (item) => {
      const expiry = new Date(item.expiryDate);
      const today = new Date();
      return Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    },
  },

  // ===========================
  // Employment Check
  // ===========================
  EmploymentCheck: {
    "_computed.daysSinceCompleted": (item) => {
      const completed = new Date(item.completedAt);
      const today = new Date();
      return Math.floor(
        (today.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24),
      );
    },
  },

  // ===========================
  // Document
  // ===========================
  Document: {
    "_computed.daysSinceUpload": (item) => {
      const uploaded = new Date(item.uploadedAt);
      const today = new Date();
      return Math.floor(
        (today.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24),
      );
    },
  },

  // ===========================
  // Employee
  // ===========================
  Employee: {
    "_computed.fullName": (item) =>
      `${item.firstName || ""} ${item.lastName || ""}`.trim(),
    "_computed.serviceYears": (item) => {
      const start = new Date(item.startDate);
      const now = new Date();
      return Math.floor(
        (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      );
    },
  },

  // ===========================
  // User
  // ===========================
  User: {
    "_computed.initials": (item) => {
      const name = item.name || "";
      return name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();
    },
  },

  // ===========================
  // Department
  // ===========================
  Department: {
    "_computed.normalisedName": (item) => item.name?.toLowerCase() || "",
  },

  // ===========================
  // Working Pattern
  // ===========================
  WorkingPattern: {
    "_computed.description": (item) => `Pattern: ${item.name}`,
  },

  // ===========================
  // Company
  // ===========================
  Company: {
    "_computed.label": (item) => `${item.name} (${item.code || "N/A"})`,
  },

  // ===========================
  // Event Category
  // ===========================
  EventCategory: {
    "_computed.normalisedName": (item) => item.name?.toLowerCase() || "",
  },
};

