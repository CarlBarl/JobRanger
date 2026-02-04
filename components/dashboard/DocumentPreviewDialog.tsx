'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Pencil, Upload, Save, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { UploadDialog } from './UploadDialog'

interface DocumentPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string | null
  fileUrl: string | null
  documentId: string
  type: 'cv' | 'personal_letter'
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  content,
  fileUrl,
  documentId,
  type,
}: DocumentPreviewDialogProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content || '')
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = editedContent !== (content || '')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsEditing(false)
      setEditedContent(content || '')
    }
  }, [open, content])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedContent: editedContent }),
      })

      if (response.ok) {
        router.refresh()
        setIsEditing(false)
      } else {
        console.error('Failed to save document:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Network error while saving document:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedContent(content || '')
    setIsEditing(false)
  }

  return (
    <>
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentType={type}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="border-b bg-background/80 px-6 py-5 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold leading-tight">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {t('documentDialogDescription')}
                </DialogDescription>
              </div>
              {fileUrl ? (
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <a href={fileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t('openInNewTab')}
                  </a>
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <div className="h-full p-6">
                <textarea
                  aria-label={t('edit')}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-full w-full resize-none rounded-lg border bg-background p-4 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder={t('noContent')}
                  autoFocus
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-lg border bg-muted/20 p-5">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {content || (
                      <span className="text-muted-foreground italic">
                        {t('noContent')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/20 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                {isEditing && isDirty ? (
                  <p className="text-sm text-amber-600">{t('unsavedChanges')}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {editedContent.length.toLocaleString()} {t('characters')}
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      {t('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!isDirty || isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('saving')}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {t('saveChanges')}
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadDialogOpen(true)}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {t('uploadNewFile')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      {t('edit')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
