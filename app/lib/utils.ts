import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeIrdNumber(input: string): string {
  return (input || "").replace(/\D/g, "").slice(0, 9);
}

function computeIrdCheckDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0);
  const remainder = sum % 11;
  if (remainder === 0) return 0;
  const candidate = 11 - remainder;
  return candidate === 11 ? 0 : candidate;
}

export function isValidIrdNumber(input: string): boolean {
  const normalized = normalizeIrdNumber(input);
  if (normalized.length < 8 || normalized.length > 9) {
    return false;
  }

  const padded = normalized.padStart(9, "0");
  const digits = padded.split("").map((char) => Number.parseInt(char, 10));
  if (digits.some((digit) => Number.isNaN(digit))) {
    return false;
  }

  const primaryWeights = [3, 2, 7, 6, 5, 4, 3, 2];
  const secondaryWeights = [7, 4, 3, 2, 5, 2, 7, 6];

  let checkDigit = computeIrdCheckDigit(digits.slice(0, 8), primaryWeights);
  if (checkDigit === 10) {
    checkDigit = computeIrdCheckDigit(digits.slice(0, 8), secondaryWeights);
  }

  if (checkDigit === 10) {
    return false;
  }

  return checkDigit === digits[8];
}

export function formatIrdNumber(input: string): string {
  const digits = normalizeIrdNumber(input);
  if (!digits) return "";

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    const head = digits.slice(0, digits.length - 3);
    const tail = digits.slice(-3);
    return head ? `${head}-${tail}` : tail;
  }

  const trimmed = digits.slice(0, 9);
  const firstGroupLength = trimmed.length === 8 ? 2 : Math.min(3, trimmed.length - 6);
  const firstGroup = trimmed.slice(0, firstGroupLength);
  const secondGroup = trimmed.slice(firstGroupLength, firstGroupLength + 3);
  const thirdGroup = trimmed.slice(firstGroupLength + 3);

  const parts = [firstGroup, secondGroup, thirdGroup].filter((part) => Boolean(part));
  return parts.join("-");
}

export function normalizeBankAccountNumber(input: string): string {
  return (input || "").replace(/\D/g, "").slice(0, 16);
}

export function isValidNzBankAccountNumber(input: string): boolean {
  const normalized = normalizeBankAccountNumber(input);
  return normalized.length === 15 || normalized.length === 16;
}

export function formatBankAccountNumber(input: string): string {
  const digits = normalizeBankAccountNumber(input);
  if (!digits) return "";

  const parts: string[] = [];
  const bank = digits.slice(0, Math.min(2, digits.length));
  if (bank) parts.push(bank);

  if (digits.length > 2) {
    const branch = digits.slice(2, Math.min(6, digits.length));
    if (branch) parts.push(branch);
  }

  if (digits.length > 6) {
    const account = digits.slice(6, Math.min(13, digits.length));
    if (account) parts.push(account);
  }

  if (digits.length > 13) {
    const suffix = digits.slice(13);
    if (suffix) parts.push(suffix);
  }

  return parts.join("-");
}

export const NZ_TAX_CODE_OPTIONS = [
  { value: "M", label: "M – Main income (no student loan)" },
  { value: "ME", label: "ME – Main income (exclusive earners' levy)" },
  { value: "M_SL", label: "M SL – Main income with student loan" },
  { value: "ME_SL", label: "ME SL – Main income (exclusive earners' levy) with student loan" },
  { value: "SB", label: "SB – Secondary income up to $14,000" },
  { value: "SB_SL", label: "SB SL – Secondary income up to $14,000 with student loan" },
  { value: "S", label: "S – Secondary income $14,001 to $48,000" },
  { value: "S_SL", label: "S SL – Secondary income $14,001 to $48,000 with student loan" },
  { value: "SH", label: "SH – Secondary income $48,001 to $70,000" },
  { value: "SH_SL", label: "SH SL – Secondary income $48,001 to $70,000 with student loan" },
  { value: "ST", label: "ST – Secondary income over $70,000" },
  { value: "ST_SL", label: "ST SL – Secondary income over $70,000 with student loan" },
  { value: "SA", label: "SA – Casual agricultural workers" },
  { value: "SA_SL", label: "SA SL – Casual agricultural workers with student loan" },
  { value: "SL", label: "SL – Student loan deductions only" },
  { value: "SED", label: "SED – Election day workers" },
  { value: "STC", label: "STC – Special tax code" },
  { value: "CAE", label: "CAE – Casual agricultural (schedular)" },
  { value: "EDW", label: "EDW – Election day workers (schedular)" },
  { value: "ND", label: "ND – No tax code provided" },
  { value: "NS", label: "NS – Non-resident seasonal workers" },
  { value: "NC", label: "NC – Child support deductions" },
  { value: "NCC", label: "NCC – Combined child support deductions" },
  { value: "WT", label: "WT – Withholding tax" },
  { value: "P", label: "P – Prescribed investor rate" },
] as const;

export type NzTaxCodeValue = (typeof NZ_TAX_CODE_OPTIONS)[number]["value"];

