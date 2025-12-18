import { useMemo } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = (errorPayload && (errorPayload.error || errorPayload.message)) || "Request failed";
    throw new Error(message);
  }
  return response.json();
};

export interface PerformanceDocument {
  id: string;
  name: string;
  category: string | null;
  path: string;
  size: number;
  type: string;
  createdAt: string;
  url: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  requiresAck: boolean;
  requiresSignature?: boolean;
  signatureDueAt?: string | null;
  signatureCompletedCount?: number;
  signatureTargetCount?: number;
  signatureOutstandingCount?: number;
  ackCompletedCount?: number;
  ackTargetCount?: number;
  ackOutstandingCount?: number;
  employeeId?: string | null;
}

export interface DocumentStats {
  totalDocuments: number;
  pendingSignatures: number;
  pendingAcknowledgements: number;
  completedDocuments: number;
}

interface UsePerformanceDocumentsOptions {
  employeeId?: string;
  enabled?: boolean;
}

type CompanyDocumentsPage = {
  items: PerformanceDocument[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export function usePerformanceDocuments({ employeeId, enabled = true }: UsePerformanceDocumentsOptions = {}) {
  const employeeDocumentsKey = useMemo(() => {
    if (!enabled) return null;
    if (!employeeId) return null;
    return `/api/documents/list-employee?employeeId=${employeeId}`;
  }, [employeeId, enabled]);

  const {
    data: employeeDocumentsData,
    error: employeeDocumentsError,
    isLoading: employeeDocumentsLoading,
    mutate: mutateEmployeeDocuments,
  } = useSWR<PerformanceDocument[]>(employeeDocumentsKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const getKey = (pageIndex: number, previousPageData: CompanyDocumentsPage | null) => {
    if (!enabled) return null;
    if (employeeId) return null;
    if (pageIndex > 0 && !previousPageData?.nextCursor) return null;
    const cursor = pageIndex === 0 ? null : previousPageData?.nextCursor ?? null;
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);
    return `/api/documents/list-company?${params.toString()}`;
  };

  const {
    data: companyPages,
    error: companyError,
    isLoading: companyLoading,
    mutate: mutateCompanyPages,
    size,
    setSize,
  } = useSWRInfinite<CompanyDocumentsPage>(getKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const companyDocuments = useMemo(() => {
    const pages = companyPages ?? [];
    return pages.flatMap((p) => p.items ?? []);
  }, [companyPages]);

  const documentsData = employeeId ? (employeeDocumentsData ?? []) : companyDocuments;
  const documentsError = employeeId ? employeeDocumentsError : companyError;
  const documentsLoading = employeeId ? employeeDocumentsLoading : companyLoading;
  const hasMore = employeeId ? false : Boolean(companyPages?.[companyPages.length - 1]?.hasMore);
  const loadMore = () => {
    if (employeeId) return;
    if (!hasMore) return;
    void setSize(size + 1);
  };

  const stats: DocumentStats = useMemo(() => {
    const documents = documentsData ?? [];

    const totalDocuments = documents.length;
    
    // Count documents with pending signatures
    const pendingSignatures = documents.reduce((sum, doc) => {
      if (doc.requiresSignature && doc.signatureOutstandingCount && doc.signatureOutstandingCount > 0) {
        return sum + doc.signatureOutstandingCount;
      }
      return sum;
    }, 0);

    // Count documents with pending acknowledgements
    const pendingAcknowledgements = documents.reduce((sum, doc) => {
      if (doc.requiresAck && doc.ackOutstandingCount && doc.ackOutstandingCount > 0) {
        return sum + doc.ackOutstandingCount;
      }
      return sum;
    }, 0);

    // Count fully completed documents (all sigs + acks done)
    const completedDocuments = documents.filter((doc) => {
      const sigCompleted = doc.signatureCompletedCount ?? 0;
      const sigTarget = doc.signatureTargetCount ?? 0;
      const ackCompleted = doc.ackCompletedCount ?? 0;
      const ackTarget = doc.ackTargetCount ?? 0;

      const sigComplete = !doc.requiresSignature || (sigTarget > 0 && sigCompleted === sigTarget);
      const ackComplete = !doc.requiresAck || (ackTarget > 0 && ackCompleted === ackTarget);

      return sigComplete && ackComplete;
    }).length;

    return {
      totalDocuments,
      pendingSignatures,
      pendingAcknowledgements,
      completedDocuments,
    };
  }, [documentsData]);

  const refresh = () => {
    if (employeeId) {
      void mutateEmployeeDocuments();
      return;
    }
    void mutateCompanyPages();
  };

  return {
    documents: documentsData ?? [],
    stats,
    isLoading: documentsLoading,
    error: documentsError,
    refresh,
    hasMore,
    loadMore,
  };
}
