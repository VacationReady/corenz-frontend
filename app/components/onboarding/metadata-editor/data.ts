import type { JourneyMetadataResponse } from "@/types/journey-metadata";

export type MetadataFetchResponse = JourneyMetadataResponse;

export const nzRegulationSnippets: Record<string, string[]> = {
  checklist: [
    "Employment Relations Act: Provide written employment agreements within 48 hours of offer acceptance.",
    "Privacy Act 2020: Capture consent before collecting sensitive information such as IRD numbers or visa details.",
  ],
  timeline: [
    "Holidays Act 2003: Align milestone dates with national and regional public holidays.",
    "Health and Safety at Work Act: Record induction milestones and keep attendance logs for inspections.",
  ],
  documents: [
    "Tax Administration Act 1994: Retain tax documentation for seven years and ensure secure storage policies are documented.",
    "KiwiSaver Act: Provide enrolment guidance and retain opt-out confirmations where applicable.",
  ],
  audit: [
    "MBIE guidance: Maintain version history for onboarding journeys and export quarterly compliance packs.",
    "Electronic Transactions Act 2002: Preserve signature evidence alongside document metadata for audits.",
  ],
};

export const nzComplianceNotices = [
  {
    id: "privacy-act",
    title: "Privacy Act consent",
    description:
      "Ensure all onboarding forms and document uploads capture explicit consent, particularly for IRD and visa verification steps.",
  },
  {
    id: "holidays-act",
    title: "Holidays Act scheduling",
    description:
      "Check milestone schedules against regional holidays to avoid assigning statutory tasks on protected days.",
  },
  {
    id: "audit-export",
    title: "Quarterly audit exports",
    description:
      "Export the journey audit trail every quarter to satisfy WorkSafe NZ and MBIE inspection requirements.",
  },
];
