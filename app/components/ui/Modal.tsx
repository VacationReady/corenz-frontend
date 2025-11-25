"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
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
  default: "bg-white dark:bg-slate-900 shadow-2xl",
  glass: "glass-ultra shadow-2xl",
  elevated: "glass-premium shadow-depth-5",
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
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-50" onClose={onClose} static open={isOpen}>
          {/* Background overlay with enhanced blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Centered panel container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                duration: 0.3
              }}
              className={cn(
                "w-full transform overflow-hidden rounded-3xl transition-all",
                sizeClasses[size],
                variantClasses[variant],
                className
              )}
            >
              <Dialog.Panel>
                {/* Header with gradient effect */}
                <div className="relative overflow-hidden">
                  {/* Subtle gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                  
                  <div className="relative px-6 py-5 border-b border-white/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-semibold text-foreground"
                        >
                          {title}
                        </Dialog.Title>
                        {description && (
                          <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      {showCloseButton && (
                        <motion.button
                          onClick={onClose}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground bg-white/50 hover:bg-white/80 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label="Close dialog"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[85vh] overflow-y-auto">
                  {children}
                </div>

                {/* Footer (optional) */}
                {footer && (
                  <div className="px-6 py-4 border-t border-white/20 bg-gray-50/50 dark:bg-white/5">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
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
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-sm font-medium transition-all shadow-sm"
          >
            {cancelText}
          </motion.button>
          <motion.button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg",
              variant === "danger"
                ? "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-rose-500/25"
                : "bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/90 hover:to-primary/70 shadow-primary/25"
            )}
          >
            {confirmText}
          </motion.button>
        </div>
      }
    >
      <p className="text-foreground">{message}</p>
    </Modal>
  );
}

// Modern alert modal
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
}) {
  const typeStyles = {
    info: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
    },
    success: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-50",
    },
    error: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-rose-500 to-red-600",
      bg: "bg-rose-50",
    },
  };

  const style = typeStyles[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex justify-end">
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-lg",
              `bg-gradient-to-r ${style.color}`
            )}
          >
            Got it
          </motion.button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-xl text-white bg-gradient-to-br",
          style.color
        )}>
          {style.icon}
        </div>
        <p className="text-foreground pt-1">{message}</p>
      </div>
    </Modal>
  );
}
