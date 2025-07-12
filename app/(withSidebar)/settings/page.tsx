'use client'

import Link from 'next/link'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const settingsLinks = [
  { title: 'Working Patterns', href: '/settings/working-patterns' },
  { title: 'Expiry Alerts', href: '/settings/expiry-alerts' },
  { title: 'Event Rules', href: '/settings/event-rules' },
  { title: 'Automatic Notifications', href: '/settings/automatic-triggers' },
  { title: 'Leave Policies', href: '/settings/leave-policies' },
]

export default function SettingsIndexPage() {
  return (
    <PageShell heading="Settings" description="Manage your system configurations">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsLinks.map(({ title, href }) => (
          <Card key={title}>
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="text-lg font-semibold">{title}</div>
              <Button asChild variant="outline">
                <Link href={href}>Manage</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
