import { useMemo } from "react";
import useSWR from "swr";

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

export function usePerformanceDocuments({ employeeId, enabled = true }: UsePerformanceDocumentsOptions = {}) {
  const documentsKey = useMemo(() => {
    if (!enabled) return null;
    
    if (employeeId) {
      // Employee-specific documents
      return `/api/documents/list-employee?employeeId=${employeeId}`;
    }
    
    // Company-wide documents (will be filtered by role/dept on backend)
    return `/api/documents/list-company`;
  }, [employeeId, enabled]);

  const {
    data: documentsData,
    error: documentsError,
    isLoading: documentsLoading,
    mutate: mutateDocuments,
  } = useSWR<PerformanceDocument[]>(documentsKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

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
      const sigComplete = !doc.requiresSignature || 
        (doc.signatureCompletedCount === doc.signatureTargetCount && doc.signatureTargetCount > 0);
      const ackComplete = !doc.requiresAck || 
        (doc.ackCompletedCount === doc.ackTargetCount && doc.ackTargetCount > 0);
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
    void mutateDocuments();
  };

  return {
    documents: documentsData ?? [],
    stats,
    isLoading: documentsLoading,
    error: documentsError,
    refresh,
  };
}
