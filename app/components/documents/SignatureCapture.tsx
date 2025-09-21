"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";

export type SignatureCaptureValue = {
  method: "TYPED" | "DRAWN";
  typedText?: string;
  dataUrl?: string; // PNG data URL when drawn
};

interface SignatureCaptureProps {
  value?: SignatureCaptureValue | null;
  onChange: (value: SignatureCaptureValue | null) => void;
  disabled?: boolean;
}

export default function SignatureCapture({ value, onChange, disabled }: SignatureCaptureProps) {
  const [method, setMethod] = useState<"TYPED" | "DRAWN">(value?.method || "DRAWN");
  const [typedText, setTypedText] = useState<string>(value?.typedText || "");
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (value?.method) setMethod(value.method);
    if (value?.typedText) setTypedText(value.typedText);
  }, [value?.method, value?.typedText]);

  const clear = () => {
    sigRef.current?.clear();
    emitChange();
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMethod("DRAWN")}
          className={`px-3 py-1 rounded border ${method === "DRAWN" ? "bg-blue-50 border-blue-400" : "bg-white"}`}
        >
          Draw
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMethod("TYPED")}
          className={`px-3 py-1 rounded border ${method === "TYPED" ? "bg-blue-50 border-blue-400" : "bg-white"}`}
        >
          Type
        </button>
      </div>

      {method === "DRAWN" ? (
        <div>
          <Label>Draw Signature</Label>
          <div className="border rounded-md">
            <SignatureCanvas
              ref={sigRef as any}
              penColor="#111827"
              backgroundColor="#ffffff"
              canvasProps={{ width: 600, height: 180, className: "w-full", "aria-label": "Signature input" }}
              onEnd={emitChange}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="button" variant="outline" onClick={clear} disabled={disabled}>
              Clear
            </Button>
            <Button type="button" variant="secondary" onClick={emitChange} disabled={disabled}>
              Preview
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Label>Type Signature</Label>
          <Input
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onBlur={emitChange}
            placeholder="Full Name"
            disabled={disabled}
          />
          <div className="mt-2 p-3 border rounded text-2xl font-signature select-none">
            {typedText || "Signature Preview"}
          </div>
        </div>
      )}
    </div>
  );
}
