'use client';

import Link from 'next/link';
import { FileSpreadsheet, Calendar, Download, Shield } from 'lucide-react';

export default function PayrollExportView() {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-card border border-border rounded-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Payroll Export</h3>
            <p className="text-muted-foreground">
              Export approved timesheet data for payroll processing
            </p>
          </div>
          <FileSpreadsheet className="h-8 w-8 text-primary opacity-50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Date Range Selection</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose any date range for your payroll export
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Multiple Formats</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Export as CSV, Excel, or JSON format
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Audit Logged</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All exports are tracked for compliance
            </p>
          </div>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h4 className="font-medium mb-2">What&apos;s Included:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 mb-4">
            <li>• Employee details (ID, name, email, department)</li>
            <li>• Time entries (clock in/out, breaks, total hours)</li>
            <li>• Overtime calculations and hourly rates</li>
            <li>• Approval status and approver information</li>
            <li>• Optional notes and location data</li>
          </ul>
          
          <Link 
            href="/admin/payroll"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Open Payroll Export Tool
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          💡 Tip: You can also access the payroll export directly at{' '}
          <Link href="/admin/payroll" className="text-primary hover:underline">
            /admin/payroll
          </Link>
        </p>
      </div>
    </div>
  );
}
