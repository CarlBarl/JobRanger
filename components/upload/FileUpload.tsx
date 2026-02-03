'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type DocumentType = 'cv' | 'cover_letter_template'

type UploadResult =
  | { success: true; data: { id: string; fileUrl: string } }
  | { success: false; error: { message?: string } }

type FileUploadProps = {
  documentType?: DocumentType
  onUploadComplete?: (document: { id: string; fileUrl: string }) => void
}

export function FileUpload({
  documentType = 'cv',
  onUploadComplete,
}: FileUploadProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] ?? null
      setFile(selectedFile)
      setError(null)
    },
    []
  )

  const handleUpload = useCallback(async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('type', documentType)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = (await response.json()) as UploadResult

      if (!json.success) {
        setError(json.error.message ?? 'Upload failed')
        return
      }

      setFile(null)
      onUploadComplete?.(json.data)
      router.refresh()
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [documentType, file, onUploadComplete, router])

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload CV</label>
          <input
            aria-label="File upload"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
