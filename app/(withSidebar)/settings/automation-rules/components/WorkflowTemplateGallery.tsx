import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export function WorkflowTemplateGallery({
  onSelectTemplate,
  onClose,
}: {
  onSelectTemplate: (template: any) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/automation-rules/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur p-6 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold">Workflow Templates</div>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-4 border">
              <div className="text-sm font-medium mb-1">{t.icon} {t.name}</div>
              <div className="text-xs text-muted-foreground mb-3">{t.description}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onSelectTemplate(t.definition || t)}>
                  Use template
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


