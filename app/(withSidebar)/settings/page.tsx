'use client'

import Link from 'next/link'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Bell,
  ClipboardList,
  AlarmClock,
  FileText,
  FolderKanban,
  Repeat,
  Settings
} from 'lucide-react'

const holidaySettings = [
  {
    title: 'Working Patterns',
    href: '/settings/working-patterns',
    icon: <Calendar className="h-5 w-5 text-muted-foreground" />
  },
  {
    title: 'Expiry Alerts',
    href: '/settings/expiry-alerts',
    icon: <AlarmClock className="h-5 w-5 text-muted-foreground" />
  },
  {
    title: 'Event Rules',
    href: '/settings/event-rules',
    icon: <ClipboardList className="h-5 w-5 text-muted-foreground" />
  },
  {
    title: 'Event Manager',
    href: '/settings/event-manager',
    icon: <Bell className="h-5 w-5 text-muted-foreground" />
  },
  {
    title: 'Leave Policies',
    href: '/settings/leave-policies',
    icon: <FileText className="h-5 w-5 text-muted-foreground" />
  }
]

const documentSettings = [
  {
    title: 'Document Types',
    href: '/settings/document-types',
    icon: <FolderKanban className="h-5 w-5 text-muted-foreground" />
  }
]

const workflowSettings = [
  {
    title: 'Automation Rules',
    href: '/settings/automation-rules',
    icon: <Repeat className="h-5 w-5 text-muted-foreground" />
  }
]

const systemSettings = [
  {
    title: 'Platform Settings',
    href: '/settings/system',
    icon: <Settings className="h-5 w-5 text-muted-foreground" />
  }
]

export default function SettingsIndexPage() {
  return (
    <PageShell title="Settings" description="Manage your system configurations">
      <div className="space-y-10">

        {/* Holidays & Absence */}
        <div>
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">Holidays & Absence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {holidaySettings.map(({ title, href, icon }) => (
              <Card key={title}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {icon}
                    {title}
                  </div>
                  <Button asChild variant="ghost">
                    <Link href={href}>Manage</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div>
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentSettings.map(({ title, href, icon }) => (
              <Card key={title}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {icon}
                    {title}
                  </div>
                  <Button asChild variant="ghost">
                    <Link href={href}>Manage</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Workflows */}
        <div>
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">Workflows</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSettings.map(({ title, href, icon }) => (
              <Card key={title}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {icon}
                    {title}
                  </div>
                  <Button asChild variant="ghost">
                    <Link href={href}>Manage</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System */}
        <div>
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">System</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemSettings.map(({ title, href, icon }) => (
              <Card key={title}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {icon}
                    {title}
                  </div>
                  <Button asChild variant="ghost">
                    <Link href={href}>Manage</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </PageShell>
  )
}
