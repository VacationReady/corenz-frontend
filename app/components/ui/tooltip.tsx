"use client";

import { ReactNode, Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}

export default function Tooltip({ children, content, className }: TooltipProps) {
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className={cn("outline-none", className)}>
            {children}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className="absolute z-50 mt-2 w-max max-w-xs rounded bg-black text-white text-xs p-2 shadow-lg"
            >
              {content}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
