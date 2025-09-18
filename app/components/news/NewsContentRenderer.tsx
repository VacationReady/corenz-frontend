"use client";

import React from "react";
import type { JSX } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Quote,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Code,
  Image as ImageIcon,
  PlayCircle,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

type ContentBlock =
  | { type: "heading"; level?: number; text: string; emoji?: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[]; style?: "default" | "checklist" | "numbered" }
  | { type: "divider"; style?: "simple" | "dots" | "gradient" }
  | { type: "quote"; text: string; author?: string; emoji?: string }
  | { type: "code"; code: string; language?: string }
  | { type: "callout"; variant: "info" | "warning" | "success" | "error"; title?: string; text: string }
  | { type: "image"; url: string; alt?: string; caption?: string; size?: "small" | "medium" | "large" | "full" }
  | { type: "video"; url: string; title?: string; thumbnail?: string }
  | { type: "embed"; url: string; title?: string; provider?: string }
  | { type: "attachment"; url: string; filename: string; size?: string; icon?: string }
  | { type: "gallery"; images: Array<{ url: string; alt?: string; caption?: string }> };

interface Props {
  content: ContentBlock[];
  className?: string;
}

const calloutConfig = {
  info: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-500",
    titleColor: "text-blue-900 dark:text-blue-100",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    iconColor: "text-yellow-500",
    titleColor: "text-yellow-900 dark:text-yellow-100",
    textColor: "text-yellow-700 dark:text-yellow-300",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    iconColor: "text-green-500",
    titleColor: "text-green-900 dark:text-green-100",
    textColor: "text-green-700 dark:text-green-300",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    iconColor: "text-red-500",
    titleColor: "text-red-900 dark:text-red-100",
    textColor: "text-red-700 dark:text-red-300",
  },
};

export default function NewsContentRenderer({ content, className }: Props) {
  const [copiedCode, setCopiedCode] = React.useState<number | null>(null);

  if (!Array.isArray(content)) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={cn("space-y-6 leading-relaxed", className)}>
      {content.map((block, index) => {
        const animationProps = {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: index * 0.05 },
        };

        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
            const sizeClasses = {
              1: "text-4xl font-bold mb-4",
              2: "text-3xl font-bold mb-3",
              3: "text-2xl font-semibold mb-3",
              4: "text-xl font-semibold mb-2",
              5: "text-lg font-medium mb-2",
              6: "text-base font-medium mb-2",
            };
            return (
              <motion.div key={index} {...animationProps}>
                <Tag
                  className={cn(
                    sizeClasses[block.level as keyof typeof sizeClasses] || sizeClasses[2],
                    "text-foreground"
                  )}
                >
                  {block.emoji && (
                    <span className="mr-2" role="img" aria-label="emoji">
                      {block.emoji}
                    </span>
                  )}
                  {block.text}
                </Tag>
              </motion.div>
            );
          }

          case "paragraph":
            return (
              <motion.p
                key={index}
                {...animationProps}
                className="text-base text-foreground/90 leading-7"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.text) }}
              />
            );

          case "bullet_list":
            return (
              <motion.div key={index} {...animationProps}>
                {block.style === "numbered" ? (
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    {block.items.map((item, i) => (
                      <li key={i} className="text-foreground/90 leading-7">
                        <span className="ml-2">{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : block.style === "checklist" ? (
                  <ul className="space-y-2">
                    {block.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-foreground/90 leading-7">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    {block.items.map((item, i) => (
                      <li key={i} className="text-foreground/90 leading-7">
                        <span className="ml-2">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            );

          case "divider":
            return (
              <motion.div key={index} {...animationProps} className="py-4">
                {block.style === "dots" ? (
                  <div className="flex justify-center gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    ))}
                  </div>
                ) : block.style === "gradient" ? (
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                ) : (
                  <hr className="border-t border-border" />
                )}
              </motion.div>
            );

          case "quote":
            return (
              <motion.div key={index} {...animationProps}>
                <blockquote className="relative pl-6 py-3 border-l-4 border-primary/50 bg-muted/30 rounded-r-lg">
                  <Quote className="absolute -left-3 -top-2 w-6 h-6 text-primary/50 bg-background rounded-full p-1" />
                  <p className="text-lg italic text-foreground/80 mb-2">
                    {block.emoji && (
                      <span className="mr-2" role="img" aria-label="quote emoji">
                        {block.emoji}
                      </span>
                    )}
                    "{block.text}"
                  </p>
                  {block.author && (
                    <p className="text-sm text-muted-foreground">— {block.author}</p>
                  )}
                </blockquote>
              </motion.div>
            );

          case "code":
            return (
              <motion.div key={index} {...animationProps} className="relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(block.code, index)}
                    className="p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                    aria-label="Copy code"
                  >
                    {copiedCode === index ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {block.language && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{block.language}</span>
                  </div>
                )}
                <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm text-foreground/90 font-mono">
                    {block.code}
                  </code>
                </pre>
              </motion.div>
            );

          case "callout":
            const config = calloutConfig[block.variant];
            const Icon = config.icon;
            return (
              <motion.div
                key={index}
                {...animationProps}
                className={cn(
                  "p-4 rounded-lg border-l-4",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.iconColor)} />
                  <div className="flex-1">
                    {block.title && (
                      <h4 className={cn("font-semibold mb-1", config.titleColor)}>
                        {block.title}
                      </h4>
                    )}
                    <p className={config.textColor}>{block.text}</p>
                  </div>
                </div>
              </motion.div>
            );

          case "image":
            const imageSizes = {
              small: "max-w-sm",
              medium: "max-w-2xl",
              large: "max-w-4xl",
              full: "w-full",
            };
            return (
              <motion.figure
                key={index}
                {...animationProps}
                className={cn("mx-auto", imageSizes[block.size || "medium"])}
              >
                <img
                  src={block.url}
                  alt={block.alt || ""}
                  className="w-full rounded-lg shadow-lg"
                />
                {block.caption && (
                  <figcaption className="mt-2 text-sm text-center text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </motion.figure>
            );

          case "video":
            return (
              <motion.div key={index} {...animationProps} className="relative">
                {block.thumbnail ? (
                  <div className="relative group cursor-pointer">
                    <img
                      src={block.thumbnail}
                      alt={block.title || "Video thumbnail"}
                      className="w-full rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
                      <PlayCircle className="w-16 h-16 text-white" />
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={block.url}
                    title={block.title || "Embedded video"}
                    className="w-full aspect-video rounded-lg"
                    allowFullScreen
                  />
                )}
                {block.title && (
                  <p className="mt-2 text-sm text-muted-foreground">{block.title}</p>
                )}
              </motion.div>
            );

          case "embed":
            return (
              <motion.div key={index} {...animationProps} className="relative">
                <iframe
                  src={block.url}
                  title={block.title || "Embedded content"}
                  className="w-full min-h-[400px] rounded-lg border border-border"
                  allowFullScreen
                />
                {block.provider && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Embedded from {block.provider}
                  </p>
                )}
              </motion.div>
            );

          case "attachment":
            return (
              <motion.div key={index} {...animationProps}>
                <a
                  href={block.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {block.icon ? (
                      <span className="text-2xl" role="img" aria-label="file icon">
                        {block.icon}
                      </span>
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {block.filename}
                    </p>
                    {block.size && (
                      <p className="text-xs text-muted-foreground">{block.size}</p>
                    )}
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              </motion.div>
            );

          case "gallery":
            return (
              <motion.div key={index} {...animationProps}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {block.images.map((image, i) => (
                    <figure key={i} className="relative group cursor-pointer">
                      <img
                        src={image.url}
                        alt={image.alt || `Gallery image ${i + 1}`}
                        className="w-full h-48 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                      />
                      {image.caption && (
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
                          <p className="text-white text-xs truncate">{image.caption}</p>
                        </div>
                      )}
                    </figure>
                  ))}
                </div>
              </motion.div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}