'use client'

import Link from 'next/link'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  Calendar,
  Bell,
  ClipboardList,
  AlarmClock,
  FileText
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

export default function SettingsIndexPage() {
  return (
    <PageShell title="Settings" description="Manage your system configurations">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-indigo-700">Holidays & Absence</h2>
      </div>

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
    </PageShell>
  )
}
