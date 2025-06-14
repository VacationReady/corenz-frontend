import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with conditional logic.
 * Common utility used in UI components.
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
