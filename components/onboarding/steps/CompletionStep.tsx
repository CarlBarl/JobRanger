'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Search, LayoutDashboard } from 'lucide-react'

interface CompletionStepProps {
  name: string
  skillsCount: number
  savedJobsCount: number
}

export function CompletionStep({ name, skillsCount, savedJobsCount }: CompletionStepProps) {
  const t = useTranslations('onboarding.completion')
  const router = useRouter()
  const [completing, setCompleting] = useState(false)

  const handleComplete = async (destination: '/jobs' | '/dashboard') => {
    if (completing) return
    setCompleting(true)

    try {
      await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })

      router.push(destination)
    } catch {
      // Still navigate even if the flag fails — middleware will handle
      router.push(destination)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Summary */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-[13px] text-stone-700">{t('cvUploaded')}</span>
        </div>
        {skillsCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] text-stone-700">
              {t('skillsFound', { count: skillsCount })}
            </span>
          </div>
        )}
        {savedJobsCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] text-stone-700">
              {t('jobsSaved', { count: savedJobsCount })}
            </span>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="w-full max-w-sm rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <p className="text-[12px] font-medium text-stone-700">
          {t('tipsTitle')}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-[12px] text-stone-500 leading-relaxed">
          <li>{t('tips.editCv')}</li>
          <li>{t('tips.regenerateSkills')}</li>
          <li>{t('tips.saveJobs')}</li>
          <li>{t('tips.generateLetters')}</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => handleComplete('/jobs')}
          disabled={completing}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-600 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {t('searchJobs')}
        </button>
        <button
          onClick={() => handleComplete('/dashboard')}
          disabled={completing}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-stone-300/60 bg-white text-[14px] font-medium text-stone-600 shadow-sm transition-all duration-200 hover:bg-stone-50 hover:text-stone-800 disabled:opacity-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t('goToDashboard')}
        </button>
      </div>
    </div>
  )
}
