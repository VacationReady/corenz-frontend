'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Form { id: string; name: string; description?: string; }

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])

  useEffect(() => {
    fetch('/api/forms').then(res => res.json())
      .then(setForms).catch(() => toast.error('Failed to load forms'))
  }, [])

  return (
    <PageShell title="Forms & Surveys" description="Manage and create forms">
      <div className="flex justify-end mb-4">
        <Button asChild><Link href="/settings/forms/new"><Plus className="mr-2 h-4 w-4"/>New Form</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map(f => (
          <Card key={f.id}>
            <CardContent className="p-4 flex flex-col gap-2">
              <h2 className="font-semibold text-lg">{f.name}</h2>
              <p className="text-sm text-muted-foreground">{f.description || 'No description'}</p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="ghost"><Link href={`/settings/forms/${f.id}/edit`}>Edit</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link href={`/settings/forms/${f.id}/analytics`}>Analytics</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
