'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

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
}: DocumentPreviewDialogProps) {
  const t = useTranslations('dashboard')

  return (
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
          {fileUrl && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/documents/${documentId}`}>
                <ExternalLink className="h-4 w-4" />
                {t('openInNewTab')}
              </Link>
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
