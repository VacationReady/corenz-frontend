'use client'

import { useState, useEffect } from 'react'
import { FormField } from './types'
import { Input } from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, X } from 'lucide-react'
import Button from '@/components/ui/Button'

export function FieldEditor({
  field,
  onChange,
}: {
  field: FormField
  onChange: (updated: FormField) => void
}) {
  const [localOptions, setLocalOptions] = useState(field.options?.join('\n') || '')
  const labelInvalid = !field.label?.trim()
  const options = field.options || []
  const hasOptionsError = (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && options.length < 2

  useEffect(() => {
    setLocalOptions(field.options?.join('\n') || '')
  }, [field.options])

  const handleOptionsChange = (value: string) => {
    setLocalOptions(value)
    onChange({
      ...field,
      options: value
        .split('\n')
        .map((opt) => opt.trim())
        .filter(Boolean),
    })
  }

  const addOption = () => {
    const newOptions = [...options, '']
    onChange({ ...field, options: newOptions })
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    onChange({ ...field, options: newOptions })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    onChange({ ...field, options: newOptions })
  }

  return (
    <div className="flex flex-col gap-6 p-4 bg-white rounded-md border shadow-sm">
      {/* Header */}
      <div className="border-b pb-2 mb-2">
        <h3 className="font-semibold text-lg">Edit Field</h3>
        <p className="text-sm text-gray-600">Type: {field.type}</p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label <span className="text-red-500">*</span>
        </label>
        <div className="mb-2 text-xs text-gray-500">
          Current value: "{field.label}" (length: {field.label?.length || 0})
        </div>
        <Input
          value={field.label || ''}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Enter field label"
          className={labelInvalid ? 'border-red-500 focus:ring-red-500' : ''}
          autoFocus={!field.label}
        />
        {labelInvalid && (
          <div className="flex items-center gap-2 text-xs text-red-500 mt-1">
            <AlertCircle className="h-4 w-4" />
            Label is required
          </div>
        )}
      </div>

      {/* Placeholder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
        <Input
          value={field.placeholder || ''}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="e.g. Enter your name"
        />
      </div>

      {/* Options Input for select/radio/checkbox */}
      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Options <span className="text-red-500">*</span>
            </label>
            <Button type="button" onClick={addOption} size="sm" variant="outline" className="h-8 px-2">
              <Plus className="h-4 w-4 mr-1" /> Add Option
            </Button>
          </div>

          {hasOptionsError && (
            <div className="flex items-center gap-2 text-red-500 text-sm mb-2">
              <AlertCircle className="h-4 w-4" /> At least 2 options are required
            </div>
          )}

          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={option} onChange={(e) => updateOption(index, e.target.value)} placeholder={`Option ${index + 1}`} className="flex-1" />
                {options.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeOption(index)}
                    size="sm"
                    variant="outline"
                    className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {options.length === 0 && (
            <Button type="button" onClick={addOption} variant="outline" className="w-full mt-2">
              <Plus className="h-4 w-4 mr-2" /> Add First Option
            </Button>
          )}

          {/* Textarea fallback option */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Edit Options</label>
            <Textarea value={localOptions} onChange={(e) => handleOptionsChange(e.target.value)} placeholder="One option per line" className="min-h-[80px]" />
          </div>
        </div>
      )}

      {/* Required Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox id={`required-${field.id}`} checked={field.required} onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })} />
        <label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer select-none">
          Required field
        </label>
      </div>
    </div>
  )
}
