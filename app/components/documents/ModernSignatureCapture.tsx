"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Pen, Type, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";

export type SignatureCaptureValue = {
  method: "TYPED" | "DRAWN";
  typedText?: string;
  dataUrl?: string;
};

interface ModernSignatureCaptureProps {
  value?: SignatureCaptureValue | null;
  onChange: (value: SignatureCaptureValue | null) => void;
  disabled?: boolean;
  companyName?: string; // Multi-tenancy support
}

export default function ModernSignatureCapture({
  value,
  onChange,
  disabled,
  companyName,
}: ModernSignatureCaptureProps) {
  const [method, setMethod] = useState<"TYPED" | "DRAWN">(value?.method || "DRAWN");
  const [typedText, setTypedText] = useState<string>(value?.typedText || "");
  const [isValid, setIsValid] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (value?.method) setMethod(value.method);
    if (value?.typedText) setTypedText(value.typedText);
  }, [value?.method, value?.typedText]);

  useEffect(() => {
    // Validate signature
    if (method === "TYPED") {
      setIsValid(typedText.trim().length >= 2);
    } else {
      setIsValid(!sigRef.current?.isEmpty());
    }
  }, [typedText, method]);

  const clear = () => {
    sigRef.current?.clear();
    emitChange();
    setIsValid(false);
  };

  const emitChange = () => {
    if (method === "TYPED") {
      const cleaned = typedText.trim();
      if (!cleaned) return onChange(null);
      onChange({ method: "TYPED", typedText: cleaned });
      return;
    }
    if (!sigRef.current) return onChange(null);
    if (sigRef.current.isEmpty()) return onChange(null);
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
    onChange({ method: "DRAWN", dataUrl });
  };

  return (
    <div className="space-y-6">
      {/* NZ Compliance Notice */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200"
      >
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Legally Binding Signature</p>
          <p className="text-blue-700">
            This electronic signature is legally binding under the{" "}
            <span className="font-semibold">
              Electronic Transactions Act 2002 (NZ)
            </span>
            . By signing, you confirm your identity and agreement to the document terms.
          </p>
        </div>
      </motion.div>

      {/* Method Selector - Modern Pills */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl">
        <motion.button
          type="button"
          disabled={disabled}
          onClick={() => setMethod("DRAWN")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            method === "DRAWN"
              ? "bg-white text-indigo-600 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Pen className="inline w-4 h-4 mr-2" />
          Draw Signature
        </motion.button>
        <motion.button
          type="button"
          disabled={disabled}
          onClick={() => setMethod("TYPED")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            method === "TYPED"
              ? "bg-white text-indigo-600 shadow-md"
              : "text-gray-600 hover:text-gray-900"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Type className="inline w-4 h-4 mr-2" />
          Type Signature
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {method === "DRAWN" ? (
          <motion.div
            key="drawn"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Sign below using your mouse or touchscreen
              {isValid && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-emerald-600"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </motion.span>
              )}
            </Label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:border-indigo-400 transition-colors bg-gradient-to-br from-white to-gray-50">
              <SignatureCanvas
                ref={sigRef as any}
                penColor="#4F46E5"
                backgroundColor="#FAFAFA"
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: "w-full cursor-crosshair",
                  "aria-label": "Signature input canvas",
                }}
                onEnd={emitChange}
              />
              {/* Watermark for multi-tenancy */}
              {companyName && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
                  {companyName}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <motion.div whileHover={{ scale: 1.05 }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  disabled={disabled}
                  className="text-gray-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </motion.div>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Signature is encrypted and stored securely
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="typed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Type your full legal name
                {isValid && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-600"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.span>
                )}
              </Label>
              <Input
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onBlur={emitChange}
                placeholder="John Smith"
                disabled={disabled}
                className="text-lg"
              />
            </div>

            {/* Live Preview with Signature Font */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-8 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden"
            >
              <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                Signature Preview
              </div>
              <div
                className="text-5xl font-serif italic text-gray-900 select-none min-h-[60px] flex items-center"
                style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
              >
                <AnimatePresence mode="wait">
                  {typedText ? (
                    <motion.span
                      key={typedText}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {typedText}
                    </motion.span>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-gray-400 text-3xl"
                    >
                      Your signature will appear here
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {/* Watermark for multi-tenancy */}
              {companyName && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {companyName}
                </div>
              )}
              {/* Decorative line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </motion.div>

            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Typed signatures are legally binding and securely encrypted
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
