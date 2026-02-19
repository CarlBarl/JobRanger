import Link from 'next/link'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CvStudioTranslations } from '@/components/cv-studio/types'

type DirectivesPanelProps = {
  t: CvStudioTranslations
  isPro: boolean
  directiveText: string
  isFeedbackLoading: boolean
  isEditLoading: boolean
  onDirectiveTextChange: (value: string) => void
  onGenerateFeedback: () => void
  onApplyEdits: () => void
}

export function DirectivesPanel({
  t,
  isPro,
  directiveText,
  isFeedbackLoading,
  isEditLoading,
  onDirectiveTextChange,
  onGenerateFeedback,
  onApplyEdits,
}: DirectivesPanelProps) {
  return (
    <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
      <label className="block text-sm font-medium text-foreground">{t('directivesLabel')}</label>
      <textarea
        value={directiveText}
        onChange={(event) => onDirectiveTextChange(event.target.value)}
        placeholder={t('directivesPlaceholder')}
        rows={4}
        maxLength={1200}
        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      <p className="mt-1 text-xs text-muted-foreground">{t('directivesHint')}</p>

      {isPro ? (
        <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">{t('proUnlockedTitle')}</p>
          <ul className="mt-1 space-y-1 text-[13px] text-muted-foreground">
            <li>{t('proUnlockedFeedback')}</li>
            <li>{t('proUnlockedEdits')}</li>
          </ul>
        </div>
      ) : null}

      {!isPro ? (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/60 to-transparent px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{t('lockTitle')}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{t('lockDescription')}</p>
            <Link
              href="/pricing"
              className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-amber-700 underline-offset-2 hover:underline"
            >
              {t('upgradeCta')}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-px">
                <path
                  d="M4.5 2.5L8 6L4.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={onGenerateFeedback}
          disabled={!isPro || isFeedbackLoading || isEditLoading}
          data-guide-id="cv-studio-generate-feedback"
          className="gap-2"
        >
          {isFeedbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isFeedbackLoading ? t('generatingFeedback') : t('generateFeedback')}
          {!isPro ? (
            <span className="rounded-full border border-amber-300/70 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {t('proFeatureBadge')}
            </span>
          ) : null}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onApplyEdits}
          disabled={!isPro || isFeedbackLoading || isEditLoading}
          className="gap-2"
        >
          {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditLoading ? t('applyingEdits') : t('applyEdits')}
          {!isPro ? (
            <span className="rounded-full border border-amber-300/70 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {t('proFeatureBadge')}
            </span>
          ) : null}
        </Button>
      </div>
    </section>
  )
}
