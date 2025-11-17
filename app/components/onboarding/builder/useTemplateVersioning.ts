"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type TemplateSnapshot = {
  id: string;
  name: string;
  description?: string;
  departments: any[];
  jobRoles: any[];
  steps: any[];
  version: number;
  timestamp: number;
};

type VersionEntry = {
  snapshot: TemplateSnapshot;
  changesSummary: string;
  createdAt: number;
};

type VersionState = {
  history: VersionEntry[];
  currentIndex: number;
  isDirty: boolean;
  lastSavedSnapshot: TemplateSnapshot | null;
};

const MAX_HISTORY_SIZE = 50;
const AUTOSAVE_DEBOUNCE_MS = 3000;

/**
 * Enhanced template versioning hook with undo/redo and autosave
 * Integrates with server-side version storage for persistence
 */
export function useTemplateVersioning(templateId: string | null) {
  const [state, setState] = useState<VersionState>({
    history: [],
    currentIndex: -1,
    isDirty: false,
    lastSavedSnapshot: null,
  });

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutosavingRef = useRef(false);

  /**
   * Initialize version history from server
   */
  const loadVersionHistory = useCallback(async () => {
    if (!templateId) return;

    try {
      const response = await fetch(
        `/api/onboarding/templates/autosave?templateId=${templateId}&limit=20`,
      );
      if (!response.ok) throw new Error("Failed to load version history");

      const { versions } = await response.json();
      
      // Convert server versions to local history format
      const history: VersionEntry[] = versions.map((v: any) => ({
        snapshot: {
          id: templateId,
          name: v.name,
          description: v.description,
          departments: [],
          jobRoles: [],
          steps: v.stepsSnapshot || [],
          version: v.version,
          timestamp: new Date(v.createdAt).getTime(),
        },
        changesSummary: v.changesSummary || "Version snapshot",
        createdAt: new Date(v.createdAt).getTime(),
      }));

      setState((prev) => ({
        ...prev,
        history,
        currentIndex: history.length > 0 ? 0 : -1,
      }));
    } catch (error) {
      console.error("Failed to load version history:", error);
      toast.error("Failed to load version history");
    }
  }, [templateId]);

  /**
   * Create a new version entry in history
   */
  const pushVersion = useCallback(
    (snapshot: TemplateSnapshot, changesSummary: string) => {
      setState((prev) => {
        // Truncate forward history if we're not at the latest
        const newHistory = prev.history.slice(0, prev.currentIndex + 1);

        // Add new entry
        newHistory.unshift({
          snapshot: { ...snapshot, timestamp: Date.now() },
          changesSummary,
          createdAt: Date.now(),
        });

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.pop();
        }

        return {
          ...prev,
          history: newHistory,
          currentIndex: 0,
          isDirty: true,
        };
      });
    },
    [],
  );

  /**
   * Undo to previous version
   */
  const undo = useCallback((): TemplateSnapshot | null => {
    let result: TemplateSnapshot | null = null;

    setState((prev) => {
      if (prev.currentIndex >= prev.history.length - 1) {
        toast.info("No more versions to undo");
        return prev;
      }

      const newIndex = prev.currentIndex + 1;
      result = prev.history[newIndex].snapshot;

      toast.success(`Reverted to: ${prev.history[newIndex].changesSummary}`);

      return {
        ...prev,
        currentIndex: newIndex,
        isDirty: true,
      };
    });

    return result;
  }, []);

  /**
   * Redo to next version
   */
  const redo = useCallback((): TemplateSnapshot | null => {
    let result: TemplateSnapshot | null = null;

    setState((prev) => {
      if (prev.currentIndex <= 0) {
        toast.info("No more versions to redo");
        return prev;
      }

      const newIndex = prev.currentIndex - 1;
      result = prev.history[newIndex].snapshot;

      toast.success(`Restored: ${prev.history[newIndex].changesSummary}`);

      return {
        ...prev,
        currentIndex: newIndex,
        isDirty: true,
      };
    });

    return result;
  }, []);

  /**
   * Autosave draft to server (debounced)
   */
  const scheduleAutosave = useCallback(
    (snapshot: TemplateSnapshot, changesSummary: string) => {
      if (!templateId || isAutosavingRef.current) return;

      // Clear existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      // Schedule new autosave
      autosaveTimerRef.current = setTimeout(async () => {
        isAutosavingRef.current = true;

        try {
          const response = await fetch("/api/onboarding/templates/autosave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateId,
              name: snapshot.name,
              description: snapshot.description,
              departments: snapshot.departments,
              jobRoles: snapshot.jobRoles,
              steps: snapshot.steps,
              changesSummary,
            }),
          });

          if (!response.ok) throw new Error("Autosave failed");

          const { versionId, createdAt } = await response.json();

          setState((prev) => ({
            ...prev,
            isDirty: false,
            lastSavedSnapshot: snapshot,
          }));

          toast.success("Draft saved", { duration: 2000 });
        } catch (error) {
          console.error("Autosave failed:", error);
          toast.error("Failed to save draft");
        } finally {
          isAutosavingRef.current = false;
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [templateId],
  );

  /**
   * Mark as saved (after explicit save/publish)
   */
  const markAsSaved = useCallback((snapshot: TemplateSnapshot) => {
    setState((prev) => ({
      ...prev,
      isDirty: false,
      lastSavedSnapshot: snapshot,
    }));
  }, []);

  /**
   * Get current version snapshot
   */
  const getCurrentSnapshot = useCallback((): TemplateSnapshot | null => {
    if (state.currentIndex < 0 || state.currentIndex >= state.history.length) {
      return null;
    }
    return state.history[state.currentIndex].snapshot;
  }, [state]);

  /**
   * Check if can undo
   */
  const canUndo = state.currentIndex < state.history.length - 1;

  /**
   * Check if can redo
   */
  const canRedo = state.currentIndex > 0;

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
  }, []);

  return {
    // State
    isDirty: state.isDirty,
    canUndo,
    canRedo,
    historySize: state.history.length,
    currentIndex: state.currentIndex,
    
    // Actions
    pushVersion,
    undo,
    redo,
    scheduleAutosave,
    markAsSaved,
    loadVersionHistory,
    getCurrentSnapshot,
    cleanup,
  };
}

export type { TemplateSnapshot, VersionEntry };
