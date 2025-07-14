'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type AudienceFilter = {
  departments?: string[]
  roles?: string[]
  locations?: string[]
  type?: 'all'
}

interface Props {
  value: AudienceFilter
  onChange: (audience: AudienceFilter) => void
}

export default function AudienceSelector({ value, onChange }: Props) {
  const [departments, setDepartments] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  // Simulate loading options (replace with your API calls if needed)
  useEffect(() => {
    setDepartments(['Sales', 'HR', 'Engineering'])
    setRoles(['Admin', 'Manager', 'Employee'])
    setLocations(['Auckland', 'Wellington', 'Christchurch'])
  }, [])

  const toggleValue = (field: keyof AudienceFilter, option: string) => {
    const current = value[field] || []
    const newValues = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]

    onChange({ ...value, [field]: newValues })
  }

  const isChecked = (field: keyof AudienceFilter, option: string) => {
    return value[field]?.includes(option)
  }

  return (
    <div className="space-y-4 border rounded p-4">
      <h3 className="font-semibold text-sm">Target Audience</h3>
      <div className="text-xs text-muted-foreground">
        Select departments, roles, or locations to target this post.
      </div>

      <div>
        <label className="font-medium text-sm">Departments</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {departments.map((dept) => (
            <Button
              key={dept}
              type="button"
              size="sm"
              variant={isChecked('departments', dept) ? 'primary' : 'ghost'}
              onClick={() => toggleValue('departments', dept)}
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-medium text-sm">Roles</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {roles.map((role) => (
            <Button
              key={role}
              type="button"
              size="sm"
              variant={isChecked('roles', role) ? 'primary' : 'ghost'}
              onClick={() => toggleValue('roles', role)}
            >
              {role}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-medium text-sm">Locations</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {locations.map((loc) => (
            <Button
              key={loc}
              type="button"
              size="sm"
              variant={isChecked('locations', loc) ? 'primary' : 'ghost'}
              onClick={() => toggleValue('locations', loc)}
            >
              {loc}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant={value.type === 'all' ? 'primary' : 'ghost'}
        onClick={() => onChange({ type: 'all' })}
      >
        Target All
      </Button>
    </div>
  )
}
