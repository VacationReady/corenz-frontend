"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Trash2, Plus, Bold, Italic, Underline } from "lucide-react";

type ContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[] };

interface Props {
  value: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
}

export default function NewsContentBuilder({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(value || []);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateBlocks = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  };

  const addBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock =
      type === "heading"
        ? { type: "heading", level: 2, text: "" }
        : type === "bullet_list"
          ? { type: "bullet_list", items: [""] }
          : { type: "paragraph", text: "" };

    updateBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updated: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    updateBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    updateBlocks(newBlocks);
  };

  const applyCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const FONT_SIZES: { label: string; value: string }[] = [
    { label: "Small", value: "2" },
    { label: "Normal", value: "3" },
    { label: "Large", value: "5" },
    { label: "Huge", value: "7" },
  ];

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div
          key={index}
          className="border rounded p-4 space-y-2 relative bg-white"
        >
          <button
            type="button"
            onClick={() => removeBlock(index)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
            title="Remove block"
          >
            <Trash2 size={16} />
          </button>

          {block.type === "heading" && (
            <>
              <label className="block text-sm font-medium">Heading</label>
              <Input
                placeholder="Heading text"
                value={block.text}
                onChange={(e) =>
                  updateBlock(index, { ...block, text: e.target.value })
                }
              />
            </>
          )}

          {block.type === "paragraph" && (
            <>
              <label className="block text-sm font-medium mb-1">
                Paragraph (Rich Text)
              </label>

              {/* Toolbar (unchanged) */}
              <div className="flex items-center gap-2 mb-2">
                <select
                  className="border text-sm px-2 py-1 rounded"
                  onChange={(e) => applyCommand("fontSize", e.target.value)}
                  defaultValue="3"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyCommand("bold")}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyCommand("italic")}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyCommand("underline")}
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </Button>
              </div>

              {/* Rich paragraph box */}
              <div
                contentEditable
                suppressContentEditableWarning
                ref={(el) => {
                  paragraphRefs.current[index] = el;
                  if (el && el.innerHTML !== block.text) {
                    el.innerHTML = block.text;
                  }
                }}
                className="min-h-[100px] border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
                onInput={(e) =>
                  updateBlock(index, {
                    ...block,
                    text: (e.target as HTMLDivElement).innerHTML,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Use formatting buttons or keyboard shortcuts (e.g. Ctrl+B)
              </p>
            </>
          )}

          {block.type === "bullet_list" && (
            <>
              <label className="block text-sm font-medium">Bullet List</label>
              {block.items.map((item, i) => (
                <Input
                  key={i}
                  className="mb-2"
                  placeholder={`Item ${i + 1}`}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.items];
                    newItems[i] = e.target.value;
                    updateBlock(index, { ...block, items: newItems });
                  }}
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateBlock(index, {
                    ...block,
                    items: [...block.items, ""],
                  })
                }
              >
                + Add Item
              </Button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          onClick={() => addBlock("heading")}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Heading
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => addBlock("paragraph")}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Paragraph
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => addBlock("bullet_list")}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Bullet List
        </Button>
      </div>
    </div>
  );
}
