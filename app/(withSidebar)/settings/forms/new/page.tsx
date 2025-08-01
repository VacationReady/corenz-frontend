'use client'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/ui/PageShell'
import FormBuilder from '@/components/forms/FormBuilder/FormBuilder'
import { toast } from 'sonner'

export default function NewFormPage() {
  const router = useRouter()

  const handleSave = async (data: { name: string; description?: string; schema: any }) => {
    const res = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { toast.success('Form created'); router.push('/settings/forms') }
    else toast.error('Failed to save form')
  }

  return (
    <PageShell title="Create Form" description="Build a new form using the builder">
      <FormBuilder onSave={handleSave}/>
    </PageShell>
  )
}
