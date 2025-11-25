'use client';

import { useState } from 'react';
import { Settings, Users, Radio, DollarSign, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

// Import the existing pages as components (we'll need to refactor them slightly)
import dynamic from 'next/dynamic';

const TimeTrackingSettings = dynamic(() => import('./TimeTrackingSettings'), { ssr: false });
const RotaGroupsManager = dynamic(() => import('./RotaGroupsManager'), { ssr: false });
const LiveAttendanceView = dynamic(() => import('./LiveAttendanceView'), { ssr: false });
const PayrollExportView = dynamic(() => import('./PayrollExportView'), { ssr: false });

export default function RotaSettingsPage() {
  const [activeTab, setActiveTab] = useState('time-tracking');

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rota & Shifts', href: '/rota' },
    { label: 'Settings', isCurrentPage: true },
  ];

  return (
    <div className="w-full min-h-screen bg-content-panel">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div className="relative overflow-hidden rounded-b-3xl border border-white/40 bg-gradient-to-r from-primary/10 via-sky-100/40 to-transparent shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:from-primary/30 dark:via-slate-900/80">
          <div className="relative z-10 px-8 py-6">
            {/* Breadcrumbs */}
            <div className="mb-4">
              <Breadcrumb items={breadcrumbItems} showHomeIcon={true} />
            </div>

            <div className="flex flex-col gap-4">
              <Link
                href="/rota"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Rota
              </Link>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Settings className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold text-foreground">Rota & Workforce Management Settings</h1>
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Manage all rota, scheduling, time tracking, and attendance settings in one place
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-card/50 backdrop-blur-md border border-border p-1 h-auto">
            <TabsTrigger 
              value="time-tracking" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Time Tracking</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rota-groups" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Rota Groups</span>
            </TabsTrigger>
            <TabsTrigger 
              value="live-attendance" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Live Attendance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payroll-export" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Payroll Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="time-tracking" className="mt-0">
            <TimeTrackingSettings />
          </TabsContent>

          <TabsContent value="rota-groups" className="mt-0">
            <RotaGroupsManager />
          </TabsContent>

          <TabsContent value="live-attendance" className="mt-0">
            <LiveAttendanceView />
          </TabsContent>

          <TabsContent value="payroll-export" className="mt-0">
            <PayrollExportView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
