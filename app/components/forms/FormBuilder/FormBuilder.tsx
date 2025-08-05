'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { v4 as uuidv4 } from 'uuid'
import { FieldPalette } from './FieldPalette'
import { FormCanvas } from './FormCanvas'
import { FieldEditor } from './FieldEditor'
import { FormPreview } from './FormPreview'
import { VisibilitySettings } from './VisibilitySettings'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { FormField } from './types'

interface FormBuilderProps {
  onSave: (data: {
    name: string
    slug: string
    description?: string
    schema: FormField[]
    visibleToRoles?: string[]
    visibleToDepartments?: string[]
    visibleToJobRoles?: string[]
  }) => void
  initialData?: {
    name: string
    slug?: string
    description?: string
    schema: FormField[]
    visibleToRoles?: string[]
    visibleToDepartments?: string[]
    visibleToJobRoles?: string[]
  }
}

export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialData?.schema || [])
  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [activeDragField, setActiveDragField] = useState<FormField | null>(null)
  const [formName, setFormName] = useState(initialData?.name || 'New Form')
  const [formSlug, setFormSlug] = useState(initialData?.slug || '')
  const [formDescription, setFormDescription] = useState(initialData?.description || '')
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(initialData?.visibleToRoles || ['ADMIN', 'MANAGER', 'EMPLOYEE'])
  const [visibleToDepartments, setVisibleToDepartments] = useState<string[]>(initialData?.visibleToDepartments || [])
  const [visibleToJobRoles, setVisibleToJobRoles] = useState<string[]>(initialData?.visibleToJobRoles || [])

  // Generate slug from name
  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim()

  const handleNameChange = (name: string) => {
    setFormName(name)
    if (!formSlug || formSlug === generateSlug(formName)) {
      setFormSlug(generateSlug(name))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null)
    const { active, over } = event
    if (!over) return

    // Add new field from palette
    if (over.id === 'canvas' && !fields.find((f) => f.id === active.id)) {
      const newField: FormField = { id: uuidv4(), type: String(active.id), label: 'Untitled Field', required: false }
      setFields((prev) => [...prev, newField])
      setSelectedField(newField)
      toast.success(`Added ${newField.type} field`)
      return
    }

    // Reorder fields
    if (active.id !== over.id) {
      const activeIndex = fields.findIndex((f) => f.id === active.id)
      const overIndex = fields.findIndex((f) => f.id === over.id)
      if (activeIndex !== -1 && overIndex !== -1) {
        setFields((prev) => arrayMove(prev, activeIndex, overIndex))
      }
    }
  }

  const saveForm = () => {
    if (!formName.trim()) return toast.error('Form name is required')
    if (!formSlug.trim()) return toast.error('Form slug is required')
    if (!fields.length) return toast.error('Add at least one field before saving')
    if (fields.some((f) => !f.label.trim())) return toast.error('All fields must have labels')
    if (!visibleToRoles.length) return toast.error('At least one role must be selected for visibility')
    if (!/^[a-z0-9-]+$/.test(formSlug)) return toast.error('Slug can only contain lowercase letters, numbers, and hyphens')

    onSave({ name: formName, slug: formSlug, description: formDescription, schema: fields, visibleToRoles, visibleToDepartments, visibleToJobRoles })
    toast.success('Form saved successfully')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Form Metadata */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Form Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input value={formName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Enter form name" className={!formName.trim() ? 'border-red-500 focus:ring-red-500' : ''} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Path (slug) <span className="text-red-500">*</span>
            </label>
            <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="form-path" className={`font-mono text-sm ${!formSlug.trim() ? 'border-red-500 focus:ring-red-500' : ''}`} />
            <p className="text-xs text-gray-500 mt-1">Used in URL: /employees/[id]/{formSlug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional form description" className="min-h-[80px]" />
          </div>
        </div>
      </div>

      {/* Visibility Settings */}
      <VisibilitySettings
        visibleToRoles={visibleToRoles}
        visibleToDepartments={visibleToDepartments}
        visibleToJobRoles={visibleToJobRoles}
        onChange={(v) => {
          setVisibleToRoles(v.visibleToRoles)
          setVisibleToDepartments(v.visibleToDepartments)
          setVisibleToJobRoles(v.visibleToJobRoles)
        }}
      />

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveDragField({ id: 'temp', type: String(e.active.id), label: String(e.active.id), required: false })}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FieldPalette />
          <FormCanvas fields={fields} setFields={setFields} selectedField={selectedField} onSelectField={setSelectedField} />
          <div>
            {selectedField ? (
              <FieldEditor
                key={selectedField.id}
                field={selectedField}
                onChange={(updated) => {
                  setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                  setSelectedField(updated)
                }}
              />
            ) : (
              <p className="text-gray-500 italic mt-4">Select a field to edit its properties</p>
            )}
          </div>
          <FormPreview fields={fields} />
        </div>
        <DragOverlay>
          {activeDragField ? <div className="p-2 px-3 bg-white border rounded shadow text-sm font-medium shadow-lg">{activeDragField.label}</div> : null}
        </DragOverlay>
      </DndContext>

      <Button onClick={saveForm} className="self-end mt-4" disabled={!formName.trim() || !fields.length || !visibleToRoles.length}>
        Save Form
      </Button>
    </div>
  )
}
