import { createClient } from '@supabase/supabase-js'

export async function uploadFileToSupabase(file: File) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filename = `${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('news-files')
    .upload(filename, file)

  if (error) {
    console.error('Upload error:', error)
    return ''
  }

  const { data: urlData } = supabase.storage
    .from('news-files')
    .getPublicUrl(filename)

  return urlData?.publicUrl || ''
}
