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
  leaveEntitlement: {
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
  leaveRequest: {
    "_computed.durationDays": (item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    },
  },

  // ===========================
  // Driver Licence
  // ===========================
  driverLicence: {
    "_computed.daysUntilExpiry": (item) => {
      const expiry = new Date(item.expiryDate);
      const today = new Date();
      return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    },
  },

  // ===========================
  // Training Record
  // ===========================
  trainingRecord: {
    "_computed.daysUntilExpiry": (item) => {
      const expiry = new Date(item.expiryDate);
      const today = new Date();
      return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    },
  },

  // ===========================
  // Employment Check
  // ===========================
  employmentCheck: {
    "_computed.daysSinceCompleted": (item) => {
      const completed = new Date(item.completedAt);
      const today = new Date();
      return Math.floor((today.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24));
    },
  },

  // ===========================
  // Document
  // ===========================
  document: {
    "_computed.daysSinceUpload": (item) => {
      const uploaded = new Date(item.uploadedAt);
      const today = new Date();
      return Math.floor((today.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24));
    },
  },

  // ===========================
  // Employee
  // ===========================
  employee: {
    "_computed.fullName": (item) => `${item.firstName || ""} ${item.lastName || ""}`.trim(),
    "_computed.serviceYears": (item) => {
      const start = new Date(item.startDate);
      const now = new Date();
      return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    },
  },

  // ===========================
  // User
  // ===========================
  user: {
    "_computed.initials": (item) => {
      const name = item.name || "";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    },
  },

  // ===========================
  // Department
  // ===========================
  department: {
    "_computed.normalisedName": (item) => item.name?.toLowerCase() || "",
  },

  // ===========================
  // Working Pattern
  // ===========================
  workingPattern: {
    "_computed.description": (item) => `Pattern: ${item.name}`,
  },

  // ===========================
  // Company
  // ===========================
  company: {
    "_computed.label": (item) => `${item.name} (${item.code || "N/A"})`,
  },

  // ===========================
  // Event Category
  // ===========================
  eventCategory: {
    "_computed.normalisedName": (item) => item.name?.toLowerCase() || "",
  },
};
