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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

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

function SettingSection({
  id,
  label,
  items
}: {
  id: string
  label: string
  items: { title: string; href: string; icon: React.ReactNode }[]
}) {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="text-xl font-semibold text-indigo-700">
        {label}
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {items.map(({ title, href, icon }) => (
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
      </AccordionContent>
    </AccordionItem>
  )
}

export default function SettingsIndexPage() {
  return (
    <PageShell title="Settings" description="Manage your system configurations">
      <Accordion type="multiple" className="space-y-6">
        <SettingSection id="holidays" label="Holidays & Absence" items={holidaySettings} />
        <SettingSection id="documents" label="Documents" items={documentSettings} />
        <SettingSection id="workflows" label="Workflows" items={workflowSettings} />
        <SettingSection id="system" label="System" items={systemSettings} />
      </Accordion>
    </PageShell>
  )
}
