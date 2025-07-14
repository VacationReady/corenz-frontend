'use client'

interface Props {
  slug: string
}

export default function DeleteNewsButton({ slug }: Props) {
  const handleDelete = (e: React.FormEvent) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      e.preventDefault()
    }
  }

  return (
    <form action={`/api/news/${slug}`} method="POST" onSubmit={handleDelete}>
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Delete
      </button>
    </form>
  )
}
