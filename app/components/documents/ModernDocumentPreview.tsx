"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ModernSignatureCapture, {
  SignatureCaptureValue,
} from "./ModernSignatureCapture";

interface ModernDocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    category?: string | null;
    size: number;
    url: string;
    requiresAck?: boolean;
    requiresSignature?: boolean;
  };
  acknowledged: boolean;
  ackDate: Date | null;
  signed: boolean;
  eligible?: boolean;
  onAcknowledge: () => void;
  onSign: (signature: SignatureCaptureValue) => void;
  signSubmitting: boolean;
  companyName?: string; // Multi-tenancy support
}

export default function ModernDocumentPreview({
  isOpen,
  onClose,
  document: doc,
  acknowledged,
  ackDate,
  signed,
  eligible = true,
  onAcknowledge,
  onSign,
  signSubmitting,
  companyName,
}: ModernDocumentPreviewProps) {
  const [signatureValue, setSignatureValue] = useState<SignatureCaptureValue | null>(null);

  const formatFileSize = (size: number) =>
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-4xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <h2 className="text-xl font-semibold text-gray-900 truncate">
                      {doc.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {doc.category && (
                      <>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                          {doc.category}
                        </span>
                        <span className="text-gray-300">•</span>
                      </>
                    )}
                    <span>{formatFileSize(doc.size)}</span>
                    {companyName && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs">{companyName}</span>
                      </>
                    )}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2 mt-3">
                {doc.requiresAck && (
                  <motion.div
                    key={acknowledged ? "ack" : "pending-ack"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      acknowledged
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {acknowledged ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledged
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Acknowledgment Required
                      </>
                    )}
                  </motion.div>
                )}
                {doc.requiresSignature && (
                  <motion.div
                    key={signed ? "signed" : "pending-sig"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      signed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {signed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Signature Required
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* PDF Viewer */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner bg-gray-50"
                >
                  <embed
                    src={`${doc.url}#toolbar=0&navpanes=0&scrollbar=1`}
                    type="application/pdf"
                    className="w-full"
                    style={{ height: "70vh", minHeight: "500px" }}
                  />
                </motion.div>

                {/* Download Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = doc.url;
                      a.download = doc.name;
                      a.target = "_blank";
                      a.click();
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Document
                  </Button>
                </motion.div>

                {/* Acknowledgment Section */}
                {doc.requiresAck && !acknowledged && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 text-lg">
                          Acknowledgment Required
                        </h3>
                        <p className="text-sm text-gray-700 mb-1">
                          Please confirm you have read and understood this document
                        </p>
                        <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/50 rounded-lg p-2 mt-3 mb-4">
                          <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                          <p>
                            Your acknowledgment is recorded and complies with NZ employment law
                            and the Privacy Act 2020.
                          </p>
                        </div>
                        <Button
                          onClick={onAcknowledge}
                          size="lg"
                          className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          I Acknowledge
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {doc.requiresAck && acknowledged && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900">
                        Acknowledged on {ackDate?.toLocaleDateString("en-NZ")}
                      </p>
                      <p className="text-emerald-700 text-xs mt-0.5">
                        Thank you for reviewing this document
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Signature Section */}
                {doc.requiresSignature && eligible && !signed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200"
                  >
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Sign Document
                    </h3>
                    <ModernSignatureCapture
                      value={signatureValue}
                      onChange={setSignatureValue}
                      companyName={companyName}
                    />
                    <Button
                      disabled={!signatureValue || signSubmitting}
                      loading={signSubmitting}
                      onClick={() => signatureValue && onSign(signatureValue)}
                      size="lg"
                      className="w-full mt-6 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      {signSubmitting ? "Submitting Signature..." : "Sign Document"}
                    </Button>
                  </motion.div>
                )}

                {doc.requiresSignature && signed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900">
                        Successfully signed on {ackDate?.toLocaleDateString("en-NZ")}
                      </p>
                      <p className="text-emerald-700 text-xs mt-0.5">
                        Your signature is legally binding and securely stored
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
