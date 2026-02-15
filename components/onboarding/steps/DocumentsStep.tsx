'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { CheckCircle2 } from 'lucide-react'

interface DocumentsStepProps {
  isReplay: boolean
  existingCvDocumentId: string | null
  onComplete: (cvDocumentId: string) => void
}

type CvChoice = 'choose' | 'existing' | 'upload'

export function DocumentsStep({
  isReplay,
  existingCvDocumentId,
  onComplete,
}: DocumentsStepProps) {
  const t = useTranslations('onboarding.documents')
  const [cvUploaded, setCvUploaded] = useState<{ id: string; fileUrl: string } | null>(null)
  const [letterUploaded, setLetterUploaded] = useState(false)
  const [cvChoice, setCvChoice] = useState<CvChoice>(
    isReplay && existingCvDocumentId ? 'choose' : 'upload'
  )

  const hasExistingCvOption = isReplay && Boolean(existingCvDocumentId)

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {/* Guide */}
      <p className="text-center text-[13px] text-stone-600 leading-relaxed">
        {t('guide')}
      </p>

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

        {hasExistingCvOption && cvChoice === 'choose' ? (
          <div className="space-y-3">
            <p className="text-[13px] text-stone-600 leading-relaxed">
              {t('replayChoiceGuide')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setCvChoice('existing')
                  setCvUploaded({ id: existingCvDocumentId!, fileUrl: '' })
                }}
                className="h-10 rounded-lg border border-stone-300/70 bg-white px-3 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                {t('replayUseExisting')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvChoice('upload')
                  setCvUploaded(null)
                }}
                className="h-10 rounded-lg bg-amber-600 px-3 text-[13px] font-medium text-white transition-colors hover:bg-amber-500"
              >
                {t('replayUploadNew')}
              </button>
            </div>
          </div>
        ) : cvChoice === 'existing' && cvUploaded ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-[13px] text-emerald-300">{t('cvUsingExisting')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCvChoice('upload')
                setCvUploaded(null)
              }}
              className="text-[12px] text-stone-500 underline-offset-2 hover:underline"
            >
              {t('replaySwitchToUpload')}
            </button>
          </div>
        ) : cvUploaded ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] text-emerald-300">{t('cvUploaded')}</span>
          </div>
        ) : (
          <FileUpload
            documentType="cv"
            variant="embedded"
            onUploadComplete={(doc) => {
              setCvChoice('upload')
              setCvUploaded(doc)
            }}
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
            <span className="text-[13px] text-emerald-300">{t('letterUploaded')}</span>
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
