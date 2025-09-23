"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  FileImage,
  FileText,
  Loader2,
  UploadCloud,
  X,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type UploadStatus = "queued" | "uploading" | "success" | "error";

export interface UploadHelpers {
  onProgress: (progress: number) => void;
  signal: AbortSignal;
}

export interface FileDropzoneItem<TMeta = any> {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  file?: File;
  previewUrl?: string;
  meta?: TMeta;
}

export interface FileDropzoneProps<TMeta = any> {
  files: FileDropzoneItem<TMeta>[];
  onFilesChange: (files: FileDropzoneItem<TMeta>[]) => void;
  onUpload: (file: File, helpers: UploadHelpers) => Promise<TMeta>;
  multiple?: boolean;
  accept?: string | string[];
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  dropLabel?: string;
  description?: string;
  helperText?: string;
}

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatFileSize = (size: number) => {
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const isPdf = (type: string, name?: string) => {
  if (!type && name) return name.toLowerCase().endsWith(".pdf");
  return type === "application/pdf" || (name ? name.toLowerCase().endsWith(".pdf") : false);
};

const isImage = (type: string, name?: string) => {
  if (type) return type.startsWith("image/");
  if (!name) return false;
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) =>
    name.toLowerCase().endsWith(ext),
  );
};

const normalizeAccept = (accept?: string | string[]) => {
  if (!accept) return undefined;
  if (Array.isArray(accept)) return accept.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);
  return accept
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const matchesAccept = (file: File, acceptList?: string[]) => {
  if (!acceptList || acceptList.length === 0) return true;
  return acceptList.some((rule) => {
    if (!rule) return true;
    const lowerRule = rule.toLowerCase();
    if (lowerRule === "*/*") return true;
    if (lowerRule.endsWith("/*")) {
      const base = lowerRule.replace(/\*$/, "");
      return file.type.toLowerCase().startsWith(base);
    }
    if (lowerRule.startsWith(".")) {
      return file.name.toLowerCase().endsWith(lowerRule);
    }
    return file.type.toLowerCase() === lowerRule;
  });
};

function cleanupPreview(url?: string) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("Failed to revoke preview url", err);
  }
}

export default function FileDropzone<TMeta = any>({
  files,
  onFilesChange,
  onUpload,
  multiple = true,
  accept,
  maxFiles,
  disabled,
  className,
  dropLabel = "Drag and drop files here or click to browse",
  description,
  helperText,
}: FileDropzoneProps<TMeta>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const controllersRef = useRef<Record<string, AbortController>>({});
  const filesRef = useRef<FileDropzoneItem<TMeta>[]>(files);
  filesRef.current = files;

  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach((controller) => {
        controller.abort();
      });
      filesRef.current.forEach((item) => cleanupPreview(item.previewUrl));
    };
  }, []);

  const acceptList = useMemo(() => normalizeAccept(accept), [accept]);

  const updateFiles = (
    updater: (current: FileDropzoneItem<TMeta>[]) => FileDropzoneItem<TMeta>[],
  ) => {
    const next = updater(filesRef.current);
    filesRef.current = next;
    onFilesChange(next);
  };

  const updateFile = (id: string, patch: Partial<FileDropzoneItem<TMeta>>) => {
    updateFiles((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleFiles = (incoming: File[]) => {
    if (!incoming.length) return;

    const accepted: File[] = [];
    const rejected: File[] = [];

    incoming.forEach((file) => {
      if (matchesAccept(file, acceptList)) accepted.push(file);
      else rejected.push(file);
    });

    if (rejected.length) {
      toast.error(
        `${rejected.length} file${rejected.length > 1 ? "s" : ""} not accepted (${rejected
          .map((file) => file.name)
          .join(", ")}).`,
      );
    }

    if (!accepted.length) return;

    let newItems: FileDropzoneItem<TMeta>[] = [];

    updateFiles((current) => {
      const currentSuccessful = current.filter((item) => item.status !== "error");
      if (maxFiles && currentSuccessful.length >= maxFiles) {
        toast.warning(`Maximum of ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed.`);
        return current;
      }

      let available = maxFiles ? maxFiles - currentSuccessful.length : accepted.length;
      if (!multiple) available = 1;

      const slice = accepted.slice(0, available);
      if (!slice.length) return current;

      if (!multiple) {
        current.forEach((item) => {
          cleanupPreview(item.previewUrl);
        });
      }

      newItems = slice.map<FileDropzoneItem<TMeta>>((file) => {
        const previewUrl = isImage(file.type, file.name)
          ? URL.createObjectURL(file)
          : undefined;
        return {
          id: createId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: "queued",
          progress: 0,
          file,
          previewUrl,
        };
      });

      return multiple ? [...current, ...newItems] : newItems;
    });

    newItems.forEach((item) => {
      startUpload(item.id);
    });
  };

  const startUpload = (id: string) => {
    const item = filesRef.current.find((candidate) => candidate.id === id);
    if (!item?.file) return;
    const controller = new AbortController();
    controllersRef.current[id] = controller;
    updateFile(id, { status: "uploading", progress: 5, error: undefined });

    const safeOnProgress = (progress: number) => {
      const next = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
      updateFile(id, { progress: next });
    };

    Promise.resolve(
      onUpload(item.file!, {
        onProgress: safeOnProgress,
        signal: controller.signal,
      }),
    )
      .then((meta) => {
        updateFile(id, { status: "success", progress: 100, meta, file: undefined });
        toast.success(`${item.name} uploaded successfully`);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          updateFile(id, { status: "error", error: "Upload cancelled", progress: 0 });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Failed to upload file";
        updateFile(id, { status: "error", error: message, progress: 0 });
        toast.error(`${item.name}: ${message}`);
      })
      .finally(() => {
        delete controllersRef.current[id];
      });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    handleFiles(files);
  };

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list) return;
    handleFiles(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    if (disabled) return;
    const controller = controllersRef.current[id];
    if (controller) controller.abort();
    const item = filesRef.current.find((file) => file.id === id);
    cleanupPreview(item?.previewUrl);
    updateFiles((current) => current.filter((file) => file.id !== id));
  };

  const retryFile = (item: FileDropzoneItem<TMeta>) => {
    if (disabled) return;
    if (!item.file) {
      toast.error("Original file not available for retry");
      return;
    }
    startUpload(item.id);
  };

  const previewFor = (item: FileDropzoneItem<TMeta>) => {
    const metaAny = item.meta as any;
    const metaType = metaAny?.type || item.type;
    const metaName = metaAny?.name || item.name;
    const metaUrl = metaAny?.url || metaAny?.signedUrl || metaAny?.previewUrl;
    const displayUrl = metaUrl || item.previewUrl;

    if (displayUrl && isImage(metaType, metaName)) {
      return (
        <img
          src={displayUrl}
          alt={metaName || item.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      );
    }

    if (displayUrl && isPdf(metaType, metaName)) {
      return (
        <iframe
          src={displayUrl}
          title={metaName || item.name}
          className="h-12 w-12 rounded-md"
        />
      );
    }

    return (
      <div className="h-12 w-12 flex items-center justify-center rounded-md bg-muted">
        {isImage(item.type, item.name) ? (
          <FileImage className="h-5 w-5 text-muted-foreground" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    );
  };

  const hasFiles = files.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          disabled && "pointer-events-none opacity-60",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (disabled) return;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled) return;
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (disabled) return;
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={disabled ? undefined : handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <div className="text-sm font-medium text-foreground">{dropLabel}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={acceptList?.join(",")}
          onChange={handleBrowse}
          disabled={disabled}
        />
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {hasFiles && (
        <div className="space-y-3">
          {files.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card/60 p-3",
                item.status === "error" && "border-red-200 bg-red-50",
              )}
            >
              {previewFor(item)}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(item.size)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {item.status === "uploading" && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                    </span>
                  )}
                  {item.status === "success" && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="h-3 w-3" /> Uploaded
                    </span>
                  )}
                  {item.status === "error" && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" /> {item.error || "Failed"}
                    </span>
                  )}
                </div>
                {item.status !== "success" && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.status === "error" ? "bg-red-400" : "bg-primary",
                      )}
                      style={{ width: `${item.status === "error" ? 100 : item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "success" && (item.meta as any)?.url && (
                  <a
                    href={(item.meta as any).url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-xs text-primary underline"
                  >
                    View document
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {!disabled && item.status === "error" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => retryFile(item)}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </Button>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    className="rounded-full p-1 text-muted-foreground transition hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
