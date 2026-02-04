'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pencil, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  return (
    <>
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentType={type}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-[300px]">
          <div className="whitespace-pre-wrap text-sm p-4 bg-muted rounded min-h-[300px]">
            {content || t('noContent')}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {fileUrl && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href={`/documents/${documentId}`}>
                  <Pencil className="h-4 w-4" />
                  {t('openInNewTab')}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              {t('uploadNewFile')}
            </Button>
          </div>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
