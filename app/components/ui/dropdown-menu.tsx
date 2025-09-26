"use client";

import React, { Fragment, useLayoutEffect, useRef, useState } from "react";
import { Menu, Transition, Portal } from "@headlessui/react";
import { cn } from "@/lib/utils"; // If you don&apos;t have this, replace with className joins.

type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
};

export function DropdownMenu({
  trigger,
  children,
  align = "right",
}: DropdownMenuProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [positionStyles, setPositionStyles] = useState<React.CSSProperties>({});

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => {
        // Compute fixed positioning relative to the trigger so the menu
        // can escape scroll/overflow containers via a portal.
        useLayoutEffect(() => {
          if (!open || !buttonRef.current) return;
          const rect = buttonRef.current.getBoundingClientRect();
          const top = rect.bottom + 8; // gap similar to mt-2
          if (align === "right") {
            setPositionStyles({ top, right: Math.max(window.innerWidth - rect.right, 0) });
          } else {
            setPositionStyles({ top, left: Math.max(rect.left, 0) });
          }
        }, [open, align]);

        return (
          <>
            <Menu.Button ref={buttonRef as any} as="div" className="inline-block">
              {trigger}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Portal>
                <Menu.Items
                  className={cn(
                    "fixed z-50 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                    align === "right" ? "origin-top-right" : "origin-top-left",
                  )}
                  style={positionStyles}
                >
                  {children}
                </Menu.Items>
              </Portal>
            </Transition>
          </>
        );
      }}
    </Menu>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  asChild = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  asChild?: boolean;
}) {
  return (
    <Menu.Item>
      {({ active }) => {
        const classes = cn(
          "w-full text-left px-4 py-2 text-sm",
          active ? "bg-gray-100" : "",
          className,
        );
        if (asChild && React.isValidElement(children)) {
          const element = children as React.ReactElement<any>;
          return React.cloneElement(element, {
            className: cn(element.props.className, classes),
            onClick: (event: React.MouseEvent) => {
              if (onClick) onClick();
              if (typeof element.props.onClick === "function") {
                element.props.onClick(event);
              }
            },
          });
        }
        return (
          <button onClick={onClick} className={classes}>
            {children}
          </button>
        );
      }}
    </Menu.Item>
  );
}
