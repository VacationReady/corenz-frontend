'use client';

import { Listbox } from '@headlessui/react';
import { Check, ChevronUpDown } from 'lucide-react';
import { Fragment } from 'react';
import clsx from 'clsx';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export default function Select({ value, onChange, options, placeholder = 'Select' }: SelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-pointer rounded border bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm">
          <span className="block truncate">{selected ? selected.label : placeholder}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {options.map((option) => (
            <Listbox.Option
              key={option.value}
              value={option.value}
              as={Fragment}
            >
              {({ active, selected }) => (
                <li
                  className={clsx(
                    active ? 'bg-primary text-white' : 'text-gray-900',
                    'relative cursor-pointer select-none py-2 pl-10 pr-4'
                  )}
                >
                  <span className={clsx(selected ? 'font-medium' : 'font-normal', 'block truncate')}>
                    {option.label}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </li>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}
