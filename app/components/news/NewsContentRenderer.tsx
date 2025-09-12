"use client";

import React from "react";
import type { JSX } from "react";

type ContentBlock =
  | { type: "heading"; level?: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "divider" }
  | { type: "quote"; text: string }
  | { type: "code"; code: string };

interface Props {
  content: ContentBlock[];
}

export default function NewsContentRenderer({ content }: Props) {
  if (!Array.isArray(content)) return null;

  return (
    <div className="space-y-4 leading-relaxed text-gray-800">
      {content.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
            return (
              <Tag key={index} className="text-xl font-semibold">
                {block.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p
                key={index}
                className="text-base"
                dangerouslySetInnerHTML={{ __html: block.text }}
              />
            );
          case "bullet_list":
            return (
              <ul key={index} className="list-disc list-inside pl-4 space-y-1">
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          case "divider":
            return <hr key={index} className="border-t my-4" />;
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-4 border-gray-300 pl-4 italic text-gray-600"
              >
                {block.text}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={index}
                className="bg-gray-100 p-2 rounded text-sm overflow-x-auto"
              >
                <code>{block.code}</code>
              </pre>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
