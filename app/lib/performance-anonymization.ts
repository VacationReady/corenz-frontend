/**
 * Performance Review Anonymization Utility
 * Handles anonymization of reviewer data in performance reviews based on privacy settings
 */

export type PerformanceReviewType = 
  | "MANAGER_REVIEW" 
  | "PEER_REVIEW" 
  | "SELF_REVIEW" 
  | "UPWARD_REVIEW" 
  | "REVIEW_360";

export interface ReviewerData {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AnonymizedReviewer {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isAnonymous?: boolean;
}

/**
 * Anonymizes reviewer data based on review type and anonymization flag
 * @param reviewer - The reviewer data to anonymize
 * @param reviewType - The type of review
 * @param isAnonymous - Whether the review should be anonymous
 * @returns Anonymized reviewer data or null
 */
export function anonymizeReviewerData(
  reviewer: ReviewerData | null | undefined,
  reviewType: PerformanceReviewType,
  isAnonymous: boolean
): AnonymizedReviewer | null {
  if (!reviewer) return null;

  // Manager reviews and self-reviews are never anonymous
  if (reviewType === "MANAGER_REVIEW" || reviewType === "SELF_REVIEW") {
    return {
      id: reviewer.id,
      firstName: reviewer.firstName,
      lastName: reviewer.lastName,
      fullName: `${reviewer.firstName} ${reviewer.lastName}`,
      isAnonymous: false,
    };
  }

  // For peer, upward, and 360 reviews, check the isAnonymous flag
  if (isAnonymous) {
    // Return anonymized data based on review type
    switch (reviewType) {
      case "PEER_REVIEW":
        return {
          fullName: "Anonymous Peer",
          isAnonymous: true,
        };
      
      case "UPWARD_REVIEW":
        return {
          fullName: "Anonymous Team Member",
          isAnonymous: true,
        };
      
      case "REVIEW_360":
        return {
          fullName: "Anonymous Reviewer",
          isAnonymous: true,
        };
      
      default:
        return {
          fullName: "Anonymous",
          isAnonymous: true,
        };
    }
  }

  // If not anonymous, return full reviewer details
  return {
    id: reviewer.id,
    firstName: reviewer.firstName,
    lastName: reviewer.lastName,
    fullName: `${reviewer.firstName} ${reviewer.lastName}`,
    isAnonymous: false,
  };
}

/**
 * Determines if a review type supports anonymization
 * @param reviewType - The type of review
 * @returns Whether the review type can be anonymous
 */
export function supportsAnonymization(reviewType: PerformanceReviewType): boolean {
  return reviewType === "PEER_REVIEW" || 
         reviewType === "UPWARD_REVIEW" || 
         reviewType === "REVIEW_360";
}

/**
 * Gets a display-friendly label for the review type
 * @param reviewType - The type of review
 * @returns Human-readable review type label
 */
export function getReviewTypeLabel(reviewType: PerformanceReviewType): string {
  const labels: Record<PerformanceReviewType, string> = {
    MANAGER_REVIEW: "Manager Review",
    PEER_REVIEW: "Peer Review",
    SELF_REVIEW: "Self Review",
    UPWARD_REVIEW: "Upward Review",
    REVIEW_360: "360° Review",
  };
  
  return labels[reviewType] || reviewType;
}
