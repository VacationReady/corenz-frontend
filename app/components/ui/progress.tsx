// /components/ui/progress.tsx

import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0–100
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full h-2 glass-subtle rounded-2xl ${className || ""}`}
      {...props}
    >
      <div
        className="h-full bg-primary rounded-2xl transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      />
    </div>
  )
);

Progress.displayName = "Progress";
