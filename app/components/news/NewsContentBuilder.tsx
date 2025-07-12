'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Trash2, Plus } from 'lucide-react';

type ContentBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] };

interface Props {
  value: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
}

export default function NewsContentBuilder({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(value || []);

  const updateBlocks = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock =
      type === 'heading'
        ? { type: 'heading', level: 2, text: '' }
        : type === 'bullet_list'
        ? { type: 'bullet_list', items: [''] }
        : { type: 'paragraph', text: '' };

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

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={index} className="border rounded p-4 space-y-2 relative bg-white">
          <button
            onClick={() => removeBlock(index)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
            title="Remove block"
          >
            <Trash2 size={16} />
          </button>

          {block.type === 'heading' && (
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

          {block.type === 'paragraph' && (
            <>
              <label className="block text-sm font-medium">Paragraph</label>
              <Textarea
                placeholder="Paragraph text"
                value={block.text}
                onChange={(e) =>
                  updateBlock(index, { ...block, text: e.target.value })
                }
              />
            </>
          )}

          {block.type === 'bullet_list' && (
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
                variant="outline"
                size="sm"
                onClick={() =>
                  updateBlock(index, {
                    ...block,
                    items: [...block.items, ''],
                  })
                }
              >
                + Add Item
              </Button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => addBlock('heading')}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Heading
        </Button>
        <Button
          variant="secondary"
          onClick={() => addBlock('paragraph')}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Paragraph
        </Button>
        <Button
          variant="secondary"
          onClick={() => addBlock('bullet_list')}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Bullet List
        </Button>
      </div>
    </div>
  );
}
