'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '@/lib/constants'

type DocumentType = 'cv' | 'cover_letter_template'

type UploadResult =
  | { success: true; data: { id: string; fileUrl: string } }
  | { success: false; error: { message?: string } }

type FileUploadProps = {
  documentType?: DocumentType
  onUploadComplete?: (document: { id: string; fileUrl: string }) => void
  variant?: 'card' | 'embedded'
}

function getFileExtension(filename: string) {
  const lower = filename.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return lower.slice(dotIndex)
}

export function FileUpload({
  documentType = 'cv',
  onUploadComplete,
  variant = 'card',
}: FileUploadProps) {
  const t = useTranslations('upload')
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const selectFile = useCallback((selectedFile: File | null | undefined) => {
    if (!selectedFile) return

    const mimeType = selectedFile.type.trim().toLowerCase()
    const extension = getFileExtension(selectedFile.name)
    const hasAllowedMime = (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mimeType)
    const hasAllowedExtension = (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(
      extension
    )

    if (!hasAllowedMime && !hasAllowedExtension) {
      setError(t('invalidType'))
      return
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setError(t('tooLarge'))
      return
    }

    setFile(selectedFile)
    setError(null)
  }, [t])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      selectFile(e.target.files?.[0])
    },
    [selectFile]
  )

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    selectFile(e.dataTransfer.files?.[0])
  }, [selectFile])

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
        setError(json.error.message ?? t('uploadFailed'))
        return
      }

      setFile(null)
      onUploadComplete?.(json.data)
      router.refresh()
    } catch {
      setError(t('uploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [documentType, file, onUploadComplete, router, t])

  const content = (
    <>
      {!file ? (
        <label
          className={cn(
            'flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-muted/60'
              : 'border-border hover:bg-muted/50'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground text-center px-2">
            {t('dropCV')}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            {t('maxSize')}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {file.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploading')}
              </>
            ) : (
              t('uploadCV')
            )}
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </>
  )

  if (variant === 'embedded') {
    return <div>{content}</div>
  }

  return (
    <Card>
      <CardContent className="p-6">{content}</CardContent>
    </Card>
  )
}
