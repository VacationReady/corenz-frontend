"use client";

import React from "react";
import { Check, X } from "lucide-react";

type ActionKey = "read" | "edit" | "delete";

export function PermissionEditor({
  screens,
  actions,
  value,
  onChange,
}: {
  screens: { key: string; label: string }[];
  actions: { key: ActionKey; label: string }[];
  value: Record<string, ActionKey[]>;
  onChange: (next: Record<string, ActionKey[]>) => void;
}) {
  const toggle = (screenKey: string, action: ActionKey, checked: boolean) => {
    const current = value[screenKey] || [];
    let next = current;
    if (checked) {
      next = Array.from(new Set([...current, action]));
      // ensure read is present if edit/delete set
      if ((action === "edit" || action === "delete") && !next.includes("read")) {
        next = ["read", ...next];
      }
    } else {
      next = current.filter((a) => a !== action);
      // if read removed, also remove edit/delete
      if (action === "read") {
        next = [];
      }
    }

    const copy = { ...value };
    if (next.length === 0) {
      delete copy[screenKey];
    } else {
      copy[screenKey] = next;
    }
    onChange(copy);
  };

  return (
    <div className="overflow-x-auto border rounded">
      <table className="min-w-full divide-y">
        <thead>
          <tr>
            <th className="text-left p-2">Screen</th>
            {actions.map((a) => (
              <th key={a.key} className="text-center p-2">{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {screens.map((s) => {
            const selected = new Set(value[s.key] || []);
            return (
              <tr key={s.key} className="odd:bg-gray-50">
                <td className="p-2">{s.label}</td>
                {actions.map((a) => (
                  <td key={a.key} className="text-center p-2">
                    <button
                      type="button"
                      aria-pressed={selected.has(a.key)}
                      onClick={() => toggle(s.key, a.key, !selected.has(a.key))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-gray-50"
                    >
                      {selected.has(a.key) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


