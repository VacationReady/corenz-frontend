"use client";

import { useCallback, useRef } from "react";

type ChangeDetail = {
  field: string;
  before: unknown;
  after: unknown;
};

type PendingEntry = {
  stepKey: string;
  stepTitle: string;
  changes: ChangeDetail[];
};

type PendingVersion = {
  tenantId: string;
  version: number;
  timestamp: number;
  changes: PendingEntry[];
};

type TenantState = {
  version: number;
  pending: Map<string, PendingEntry>;
  history: PendingVersion[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clone = <T,>(value: T): T => {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { structuredClone?: <V>(payload: V) => V }).structuredClone === "function"
  ) {
    return (globalThis as { structuredClone: <V>(payload: V) => V }).structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const diffMetadata = (baseline: unknown, current: unknown): ChangeDetail[] => {
  if (!isObject(baseline) || !isObject(current)) {
    const baselineString = JSON.stringify(baseline ?? null);
    const currentString = JSON.stringify(current ?? null);
    if (baselineString === currentString) {
      return [];
    }
    return [
      {
        field: "value",
        before: baseline,
        after: current,
      },
    ];
  }

  const previous = baseline as Record<string, unknown>;
  const next = current as Record<string, unknown>;
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changes: ChangeDetail[] = [];

  keys.forEach((key) => {
    const before = previous[key];
    const after = next[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ field: key, before, after });
    }
  });

  return changes;
};

export function useTenantMetadataVersioning() {
  const storeRef = useRef<Map<string, TenantState>>(new Map());

  const ensureState = useCallback((tenantId: string): TenantState => {
    const store = storeRef.current;
    if (!store.has(tenantId)) {
      store.set(tenantId, {
        version: 0,
        pending: new Map(),
        history: [],
      });
    }
    return store.get(tenantId)!;
  }, []);

  const queueMetadataChange = useCallback(
    (
      tenantId: string | null | undefined,
      stepKey: string,
      stepTitle: string,
      baselineMetadata: unknown,
      currentMetadata: unknown,
    ) => {
      if (!tenantId) return null;
      const state = ensureState(tenantId);
      const changes = diffMetadata(baselineMetadata, currentMetadata);
      if (!changes.length) {
        state.pending.delete(stepKey);
        return null;
      }
      const entry: PendingEntry = {
        stepKey,
        stepTitle,
        changes,
      };
      state.pending.set(stepKey, entry);
      return entry;
    },
    [ensureState],
  );

  const prepareCommit = useCallback(
    (tenantId: string | null | undefined): PendingVersion | null => {
      if (!tenantId) return null;
      const state = ensureState(tenantId);
      if (!state.pending.size) return null;
      return {
        tenantId,
        version: state.version + 1,
        timestamp: Date.now(),
        changes: Array.from(state.pending.values()).map((entry) => ({
          ...entry,
          changes: entry.changes.map((change) => ({ ...change })),
        })),
      };
    },
    [ensureState],
  );

  const commit = useCallback(
    (tenantId: string | null | undefined, pending: PendingVersion | null | undefined) => {
      if (!tenantId || !pending) return;
      const state = ensureState(tenantId);
      state.version = pending.version;
      state.pending.clear();
      state.history.unshift(clone(pending));
      if (state.history.length > 20) {
        state.history.pop();
      }
    },
    [ensureState],
  );

  const rollback = useCallback((tenantId: string | null | undefined) => {
    if (!tenantId) return;
    const state = ensureState(tenantId);
    state.pending.clear();
  }, [ensureState]);

  const getHistory = useCallback(
    (tenantId: string | null | undefined): PendingVersion[] => {
      if (!tenantId) return [];
      const state = ensureState(tenantId);
      return state.history.map((entry) => clone(entry));
    },
    [ensureState],
  );

  return {
    queueMetadataChange,
    prepareCommit,
    commit,
    rollback,
    getHistory,
  } as const;
}

export type { PendingVersion };
