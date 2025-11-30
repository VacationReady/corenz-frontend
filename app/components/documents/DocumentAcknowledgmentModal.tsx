"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { CheckCircle, FileText, AlertCircle, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface DocumentAcknowledgmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: {
    id: string;
    name: string;
    url?: string;
    requiresAck?: boolean;
  } | null;
  onAcknowledge: (docId: string) => Promise<void>;
}

export function DocumentAcknowledgmentModal({
  open,
  onOpenChange,
  doc,
  onAcknowledge
}: DocumentAcknowledgmentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  if (!doc) return null;

  const handleAcknowledge = async () => {
    if (!hasRead) {
      toast.error("Please confirm you have read the document");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onAcknowledge(doc.id);
      setAcknowledged(true);
      // Close modal after a short delay to show success state
      setTimeout(() => {
        onOpenChange(false);
        setAcknowledged(false); // Reset for next time
        setHasRead(false);
        setIsSubmitting(false);
      }, 1500);
    } catch (error) {
      toast.error("Failed to acknowledge document");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-gray-50/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {doc.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Please review and acknowledge this document
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.url && (
              <Button variant="ghost" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-gray-100">
          {doc.url ? (
            <iframe
              src={`${doc.url}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              title={doc.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Document preview not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Action Area */}
        <div className="p-6 bg-white border-t shrink-0">
          <AnimatePresence mode="wait">
            {acknowledged ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-2 text-green-600"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="font-semibold text-lg">Successfully Acknowledged!</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3">
                    <p className="text-sm text-blue-900 font-medium">
                      Acknowledgment Required
                    </p>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      By acknowledging this document, you confirm that you have read, understood, and agree to the contents of <span className="font-semibold">{doc.name}</span>. This action is recorded in your employee file.
                    </p>
                    
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={hasRead}
                          onChange={(e) => setHasRead(e.target.checked)}
                        />
                        <div className={`
                          w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                          ${hasRead 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-blue-400 bg-white group-hover:border-blue-500'
                          }
                        `}>
                          <CheckCircle className={`w-3.5 h-3.5 text-white ${hasRead ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </div>
                      <span className={`text-sm font-medium transition-colors ${hasRead ? 'text-blue-900' : 'text-blue-700'}`}>
                        I have read and understood this document
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAcknowledge}
                    disabled={!hasRead || isSubmitting}
                    loading={isSubmitting}
                    className={`
                      px-8 transition-all duration-300
                      ${hasRead 
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl translate-y-0' 
                        : 'bg-gray-200 text-gray-400 shadow-none'
                      }
                    `}
                  >
                    {isSubmitting ? "Acknowledging..." : "Confirm Acknowledgment"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}












