```tsx
// components/ui/Checkbox.tsx using Headless UI

'use client';

import { useState } from 'react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function Checkbox({ id, checked, onCheckedChange }: CheckboxProps) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
    />
  );
}
```
