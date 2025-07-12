'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { uploadFileToSupabase } from '@/lib/news/uploadFileToSupabase'

export default function CreateNewsPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [sendEmail, setSendEmail] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Upload all files to Supabase and get URLs
    const uploadedUrls = await Promise.all(
      attachments.map(file => uploadFileToSupabase(file))
    )

    const res = await fetch('/api/news', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content,
        videoEmbedUrl: videoUrl,
        attachments: uploadedUrls,
        sendEmail,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (res.ok) {
      router.push('/news')
    } else {
      alert('Failed to create news post.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Create News Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content</label>
          <Textarea rows={8} value={content} onChange={e => setContent(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Video Embed URL (optional)</label>
          <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attachments</label>
          <Input type="file" multiple onChange={handleFileChange} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={sendEmail} onCheckedChange={(checked) => setSendEmail(checked)} />
          <span className="text-sm">Send email notification</span>
        </div>

        <Button type="submit">Publish News</Button>
      </form>
    </div>
  )
}
