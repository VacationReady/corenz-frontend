'use client';

export default function PayrollExportView() {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-card border border-border rounded-xl">
        <h3 className="text-lg font-semibold mb-4">Payroll Export</h3>
        <p className="text-muted-foreground mb-4">
          Export approved timesheet data for payroll processing
        </p>
        <iframe 
          src="/admin/payroll" 
          className="w-full h-[800px] border-0 rounded-lg"
          title="Payroll Export"
        />
      </div>
    </div>
  );
}
