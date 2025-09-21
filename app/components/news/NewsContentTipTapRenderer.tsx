"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface NewsContentTipTapRendererProps {
  content: any;
  className?: string;
  minHeight?: string;
}

export default function NewsContentTipTapRenderer({
  content,
  className,
  minHeight = "200px",
}: NewsContentTipTapRendererProps) {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Link.configure({ openOnClick: true, HTMLAttributes: { class: "text-primary underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: "rounded-lg bg-muted p-4 font-mono text-sm" },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg dark:prose-invert",
          "max-w-none focus:outline-none",
          "min-h-[200px]",
          className,
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content || {});
  }, [content, editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}


