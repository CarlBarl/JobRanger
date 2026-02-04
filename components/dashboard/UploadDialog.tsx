'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { useTranslations } from 'next-intl'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: 'cv' | 'personal_letter'
}

export function UploadDialog({
  open,
  onOpenChange,
  documentType,
}: UploadDialogProps) {
  const t = useTranslations('dashboard')

  const handleUploadComplete = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {documentType === 'cv' ? t('uploadNewCV') : t('uploadNewPersonalLetter')}
          </DialogTitle>
          <DialogDescription>
            {t('replaceDocumentDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {documentType === 'cv' ? (
            <FileUpload variant="embedded" onUploadComplete={handleUploadComplete} />
          ) : (
            <PersonalLetterUpload variant="embedded" onUploadComplete={handleUploadComplete} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
