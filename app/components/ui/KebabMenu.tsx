"use client";

import { Menu } from "@headlessui/react";
import { MoreVertical } from "lucide-react";
import clsx from "clsx";

interface KebabMenuProps {
  options: { label: string; action: () => void }[];
}

export default function KebabMenu({ options }: KebabMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="p-2 hover:bg-gray-100 rounded">
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded shadow-lg focus:outline-none z-50">
        {options.map((option, idx) => (
          <Menu.Item key={idx}>
            {({ active }) => (
              <button
                onClick={option.action}
                className={clsx(
                  "w-full text-left px-4 py-2 text-sm",
                  active ? "bg-gray-100" : "",
                )}
              >
                {option.label}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
