"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Type,
  Smile,
  Hash,
  AtSign,
  Calendar,
  MapPin,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useCallback, useState } from "react";

const lowlight = createLowlight(common);

interface NewsEditorProps {
  value?: any;
  onChange?: (content: any) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

// Emoji picker data
const emojiCategories = [
  {
    name: "Frequently Used",
    emojis: ["😀", "👍", "❤️", "🎉", "🔥", "✨", "📌", "⭐", "🚀", "💡", "📢", "🎯"],
  },
  {
    name: "People",
    emojis: ["😊", "😂", "🤔", "😎", "🥳", "😍", "🤗", "😅", "😭", "🙌", "👏", "💪"],
  },
  {
    name: "Objects",
    emojis: ["📝", "📊", "📈", "📅", "📍", "🔔", "💼", "🏆", "🎁", "📸", "🎨", "🎬"],
  },
  {
    name: "Symbols",
    emojis: ["✅", "❌", "⚠️", "ℹ️", "❓", "❗", "➡️", "⬅️", "⬆️", "⬇️", "🔄", "💯"],
  },
];

// Callout templates
const calloutTemplates = [
  { type: "info", icon: Info, label: "Information", color: "blue" },
  { type: "warning", icon: AlertCircle, label: "Warning", color: "yellow" },
  { type: "success", icon: CheckCircle, label: "Success", color: "green" },
  { type: "error", icon: XCircle, label: "Error", color: "red" },
];

const MenuButton = ({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-2 rounded-lg transition-all duration-200",
      "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
      isActive && "bg-primary/10 text-primary"
    )}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const MenuDivider = () => <div className="w-px h-6 bg-border mx-1" />;

export default function NewsEditor({
  value,
  onChange,
  placeholder = "Start typing your news content...",
  className,
  minHeight = "400px",
}: NewsEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-lg bg-muted p-4 font-mono text-sm",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg dark:prose-invert",
          "max-w-none focus:outline-none",
          "p-4 min-h-[400px]",
          className
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
      setShowLinkDialog(false);
    }
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageDialog(false);
    }
  }, [editor, imageUrl]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (editor) {
        editor.chain().focus().insertContent(emoji).run();
        setShowEmojiPicker(false);
      }
    },
    [editor]
  );

  const insertCallout = useCallback(
    (type: string) => {
      if (editor) {
        const content = `
          <div class="callout callout-${type} p-4 rounded-lg border-l-4 my-4">
            <p>Your ${type} message here...</p>
          </div>
        `;
        editor.chain().focus().insertContent(content).run();
      }
    },
    [editor]
  );

  const insertSlashCommand = useCallback(
    (command: string) => {
      if (!editor) return;

      switch (command) {
        case "/h1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "/h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "/h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "/bullet":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "/number":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "/quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "/code":
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case "/divider":
          editor.chain().focus().setHorizontalRule().run();
          break;
        case "/image":
          setShowImageDialog(true);
          break;
        case "/link":
          setShowLinkDialog(true);
          break;
        case "/emoji":
          setShowEmojiPicker(true);
          break;
        case "/mention":
          editor.chain().focus().insertContent("@").run();
          break;
        case "/date":
          const today = new Date().toLocaleDateString();
          editor.chain().focus().insertContent(today).run();
          break;
      }
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border p-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </MenuButton>

          <MenuDivider />

          {/* Headings */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </MenuButton>

          <MenuDivider />

          {/* Lists */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </MenuButton>

          <MenuDivider />

          {/* Alignment */}
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </MenuButton>

          <MenuDivider />

          {/* Inserts */}
          <MenuButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line"
          >
            <Minus className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => setShowLinkDialog(true)}
            isActive={editor.isActive("link")}
            title="Add Link"
          >
            <LinkIcon className="w-4 h-4" />
          </MenuButton>
          {editor.isActive("link") && (
            <MenuButton onClick={removeLink} title="Remove Link">
              <Unlink className="w-4 h-4" />
            </MenuButton>
          )}
          <MenuButton onClick={() => setShowImageDialog(true)} title="Add Image">
            <ImageIcon className="w-4 h-4" />
          </MenuButton>
          <MenuButton onClick={() => setShowEmojiPicker(true)} title="Add Emoji">
            <Smile className="w-4 h-4" />
          </MenuButton>

          <MenuDivider />

          {/* Undo/Redo */}
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Quick Insert Bar */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Quick insert:</span>
          <div className="flex flex-wrap gap-1">
            {calloutTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.type}
                  onClick={() => insertCallout(template.type)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                    "bg-muted/50 hover:bg-muted transition-all",
                    `hover:text-${template.color}-600 dark:hover:text-${template.color}-400`
                  )}
                  title={`Insert ${template.label} callout`}
                  type="button"
                >
                  <Icon className="w-3 h-3" />
                  <span>{template.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            "min-h-[400px] bg-card rounded-b-lg",
            "prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none",
            "[&_.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.is-editor-empty:first-child::before]:float-left",
            "[&_.is-editor-empty:first-child::before]:h-0",
            "[&_.is-editor-empty:first-child::before]:pointer-events-none"
          )}
        />

        {/* Slash Commands Helper */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <div className="bg-muted/80 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
            <span className="font-medium">Pro tip:</span> Type{" "}
            <kbd className="px-1 py-0.5 bg-background rounded">/</kbd> for slash commands
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-4 z-20 bg-card rounded-xl shadow-xl border border-border p-4 max-w-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Insert Emoji</h3>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 hover:bg-muted rounded-lg"
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {emojiCategories.map((category) => (
              <div key={category.name}>
                <p className="text-xs text-muted-foreground mb-1">{category.name}</p>
                <div className="grid grid-cols-8 gap-1">
                  {category.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                      title={emoji}
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-4 z-20 bg-card rounded-xl shadow-xl border border-border p-4 w-80"
        >
          <h3 className="font-semibold mb-3">Add Link</h3>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addLink}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              type="button"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl("");
              }}
              className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
              type="button"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-4 z-20 bg-card rounded-xl shadow-xl border border-border p-4 w-80"
        >
          <h3 className="font-semibold mb-3">Add Image</h3>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addImage}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              type="button"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowImageDialog(false);
                setImageUrl("");
              }}
              className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
              type="button"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
