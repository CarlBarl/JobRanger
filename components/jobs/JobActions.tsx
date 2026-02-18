'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useJobActions } from '@/components/jobs/hooks/useJobActions'
import { Button } from '@/components/ui/button'

export function JobActions({
  afJobId,
  defaultGuidance,
  existingLettersCount = 0,
}: {
  afJobId: string
  defaultGuidance?: string | null
  existingLettersCount?: number
}) {
  const t = useTranslations('jobs')
  const locale = useLocale()
  const state = useJobActions({
    afJobId,
    defaultGuidance,
    existingLettersCount,
    locale,
    t,
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border bg-muted/20 p-3" data-guide-id="jobs-detail-guidance-input">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('actions.guidanceLabel')}
        </label>
        <textarea
          value={state.guidanceOverride}
          onChange={(event) => state.setGuidanceOverride(event.target.value)}
          placeholder={t('actions.guidancePlaceholder')}
          rows={4}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/80">{t('actions.guidanceHelp')}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={state.handleSave}
        disabled={state.saving || state.saved}
        className="w-full justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={state.saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={state.saved ? 0 : 1.5}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
          />
        </svg>
        {state.saved ? t('actions.saved') : state.saving ? t('actions.saving') : t('actions.saveJob')}
      </Button>
      {state.generated ? (
        <div
          className="rounded-md bg-primary/5 border border-primary/15 px-3 py-2.5 text-center"
          data-guide-id="jobs-detail-generated-now"
        >
          <p className="text-sm font-medium text-foreground">{t('actions.generateSuccess')}</p>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={state.handleGenerate}
          disabled={state.generateDisabled}
          data-guide-id="jobs-detail-generate-button"
          className="w-full justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M3 13V3H10L13 6V13H3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M10 3V6H13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <path d="M5.5 11H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          {state.generating ? t('actions.generating') : t('actions.generateLetter')}
        </Button>
      )}
      {state.lettersForJobCount > 0 ? (
        <Link
          href={state.lettersForJobHref}
          data-guide-id="jobs-detail-view-letters-link"
          className="inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('actions.viewLettersForJob', { count: state.lettersForJobCount })}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}
      {state.generateQuotaExhausted ? (
        <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/80">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-amber-600">
                <path d="M7 1L8.5 5H12.5L9.25 7.5L10.5 12L7 9.25L3.5 12L4.75 7.5L1.5 5H5.5L7 1Z" fill="currentColor" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">{t('actions.quotaExceededTitle')}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {t('actions.quotaUsage', {
                  used: state.generateLetterQuota?.used ?? 0,
                  limit: state.generateLetterQuota?.limit ?? 1,
                })}{' '}
                {t('actions.quotaResetAt', { date: state.resetAtLabel })}
              </p>
              <p className="mt-2 text-[13px] text-foreground/70">{t('actions.quotaValueProp')}</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="pro-cta mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-white shadow-sm"
          >
            {t('actions.upgradeCta')}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      ) : null}
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}
