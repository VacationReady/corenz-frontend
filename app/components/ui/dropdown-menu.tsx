"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { cn } from "@/lib/utils"; // If you don't have this, replace with className joins.

type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
};

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as={Fragment}>{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            "absolute z-50 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          onClick={onClick}
          className={cn(
            "w-full text-left px-4 py-2 text-sm",
            active ? "bg-gray-100" : "",
            className
          )}
        >
          {children}
        </button>
      )}
    </Menu.Item>
  );
}
