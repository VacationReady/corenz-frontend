"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
type ModalVariant = "default" | "glass" | "elevated";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  className?: string;
  description?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[90vw] lg:max-w-6xl",
};

const variantClasses: Record<ModalVariant, string> = {
  default: "glass-card shadow-2xl",
  glass: "glass-ultra shadow-2xl",
  elevated: "glass-strong shadow-depth-5",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  variant = "glass",
  showCloseButton = true,
  footer,
  className,
  description,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background overlay with enhanced blur */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />
        </Transition.Child>

        {/* Centered panel with glass morphism */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <Dialog.Panel 
              className={cn(
                "w-full transform overflow-hidden rounded-3xl transition-all",
                sizeClasses[size],
                variantClasses[variant],
                className
              )}
            >
              {/* Header with glass effect */}
              <div className="glass-subtle border-b border-glass px-6 py-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-foreground"
                    >
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="glass-subtle p-2 rounded-xl text-muted-foreground hover:text-foreground hover-glass transition-glass focus-ring"
                      aria-label="Close dialog"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {children}
              </div>

              {/* Footer (optional) */}
              {footer && (
                <div className="glass-subtle border-t border-glass px-6 py-4">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

// Convenience modal components for common patterns
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="glass-subtle px-4 py-2 rounded-xl hover-glass transition-glass text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-glass shadow-depth-1",
              variant === "danger" 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-foreground">{message}</p>
    </Modal>
  );
}
