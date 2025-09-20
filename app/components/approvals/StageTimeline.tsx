"use client";

export type Decision = {
  id: string;
  approverId: string;
  approverName: string | null;
  approverEmail: string | null;
  order: number;
  status: string;
  isActive: boolean;
};

export type Stage = {
  id: string;
  name: string | null;
  order: number;
  mode: string;
  status: string;
  isActive: boolean;
  decisions: Decision[];
};

export function StageTimeline({ stages }: { stages?: Stage[] }) {
  if (!stages || stages.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {stages.map((s) => (
        <div key={s.id} className={`rounded border p-2 ${s.isActive ? "border-primary" : "border-border"}`}>
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">
              {s.name || `Stage ${s.order + 1}`} • {s.mode.replace(/_/g, " ")}
            </div>
            <div className="text-xs uppercase">{s.status}</div>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {s.decisions.map((d) => (
              <span key={d.id} className={`px-2 py-0.5 rounded-full border ${d.isActive ? "border-primary text-primary" : "border-border"}`}>
                {d.approverName || d.approverEmail || d.approverId} — {d.status}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


