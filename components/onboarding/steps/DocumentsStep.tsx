'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { CheckCircle2 } from 'lucide-react'

interface DocumentsStepProps {
  onComplete: (cvDocumentId: string) => void
}

export function DocumentsStep({ onComplete }: DocumentsStepProps) {
  const t = useTranslations('onboarding.documents')
  const [cvUploaded, setCvUploaded] = useState<{ id: string; fileUrl: string } | null>(null)
  const [letterUploaded, setLetterUploaded] = useState(false)

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {/* CV Upload */}
      <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-stone-800">
            {t('cvTitle')}
          </h3>
          <div className="flex items-center gap-2">
            {cvUploaded && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <span className="text-[11px] font-medium text-amber-500/80">
              {t('cvRequired')}
            </span>
          </div>
        </div>
        {cvUploaded ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] text-emerald-300">CV uploaded successfully</span>
          </div>
        ) : (
          <FileUpload
            documentType="cv"
            variant="embedded"
            onUploadComplete={(doc) => setCvUploaded(doc)}
          />
        )}
      </div>

      {/* Personal Letter Upload */}
      <div className="rounded-xl border border-stone-200/40 bg-white/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-stone-700">
            {t('letterTitle')}
          </h3>
          <div className="flex items-center gap-2">
            {letterUploaded && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <span className="text-[11px] text-stone-400">
              {t('letterOptional')}
            </span>
          </div>
        </div>
        {letterUploaded ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] text-emerald-300">Personal letter uploaded</span>
          </div>
        ) : (
          <PersonalLetterUpload
            variant="embedded"
            onUploadComplete={() => setLetterUploaded(true)}
          />
        )}
      </div>

      {/* Tip */}
      <p className="text-center text-[12px] text-stone-500 leading-relaxed">
        {t('tip')}
      </p>

      {/* Continue */}
      <button
        onClick={() => {
          if (cvUploaded) onComplete(cvUploaded.id)
        }}
        disabled={!cvUploaded}
        className="h-11 rounded-xl bg-amber-600 px-8 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed self-center"
      >
        {t('continue')}
      </button>
    </div>
  )
}
