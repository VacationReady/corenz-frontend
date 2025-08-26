'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Users, Calendar, Settings, Trash2, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Form {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  visibleToRoles?: string[];
  createdAt: string;
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/forms')
      .then(res => res.json())
      .then(data => {
        setForms(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load forms')
        setLoading(false)
      })
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getRoleLabels = (roles?: string[]) => {
    if (!roles || roles.length === 0) return 'No roles'
    return roles.map(role => role.charAt(0) + role.slice(1).toLowerCase()).join(', ')
  }

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete "${formName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/forms/${formId}`, { method: 'DELETE' })

      if (res.ok) {
        toast.success('Form deleted successfully')
        setForms(forms.filter(f => f.id !== formId))
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete form')
      }
    } catch (error) {
      toast.error('Failed to delete form')
      console.error('Delete error:', error)
    }
  }

  if (loading) {
    return (
      <PageShell title="Forms & Surveys" description="Manage and create forms">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Forms & Surveys" description="Manage and create forms">
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {forms.length} form{forms.length !== 1 ? 's' : ''} total
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/forms/exit-interview">
              Exit Interview Forms
            </Link>
          </Button>
          <Button asChild>
            <Link href="/settings/forms/new">
              <Plus className="mr-2 h-4 w-4" />
              New Form
            </Link>
          </Button>
        </div>
      </div>

      {forms.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-4">Create your first form to get started</p>
            <Button asChild>
              <Link href="/settings/forms/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(f => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.isActive ? "default" : "secondary"}>
                      {f.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                      align="right"
                    >
                      <DropdownMenuItem
                        onClick={() => handleDeleteForm(f.id, f.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Form
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {f.description || 'No description provided'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="h-3 w-3" />
                    <span>Visible to: {getRoleLabels(f.visibleToRoles)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {formatDate(f.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/settings/forms/${f.id}/edit`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/settings/forms/${f.id}/analytics`}>Analytics</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
