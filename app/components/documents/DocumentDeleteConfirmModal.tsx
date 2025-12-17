"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface DocumentDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentName: string;
  isDeleting?: boolean;
}

export default function DocumentDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isDeleting = false,
}: DocumentDeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md mx-4 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10 rounded-full blur-3xl opacity-50 -z-10" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Warning Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg"
          >
            <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2"
          >
            Delete Document?
          </motion.h2>

          {/* Document name */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-gray-600 dark:text-gray-300 mb-4"
          >
            You are about to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              &ldquo;{documentName}&rdquo;
            </span>
          </motion.p>

          {/* Warning message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6"
          >
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-semibold">This action cannot be undone.</span>{" "}
                Once deleted, you won&apos;t be able to recover this document or any associated acknowledgements and signatures.
              </p>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    ⏳
                  </motion.span>
                  Deleting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Document
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}





















