import { cn } from '@/lib/utils'
import type { CvFeedbackItem, CvEditData, CvFeedbackData, CvStudioTranslations } from '@/components/cv-studio/types'

const PRIORITY_STYLE: Record<CvFeedbackItem['priority'], string> = {
  high: 'border-destructive/35 bg-destructive/5 text-destructive',
  medium: 'border-amber-300/50 bg-amber-50 text-amber-700',
  low: 'border-emerald-300/50 bg-emerald-50 text-emerald-700',
}

type ResultsPanelProps = {
  t: CvStudioTranslations
  feedbackResult: CvFeedbackData | null
  editResult: CvEditData | null
}

export function ResultsPanel({ t, feedbackResult, editResult }: ResultsPanelProps) {
  return (
    <>
      {feedbackResult ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">{t('feedbackTitle')}</h2>
            <span className="text-xs text-muted-foreground">
              {feedbackResult.targeted ? t('targetedFeedback') : t('genericFeedback')}
            </span>
          </div>

          <p className="mt-2 text-sm text-foreground/90">{feedbackResult.feedback.overallSummary}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('strengthsTitle')}</h3>
              {feedbackResult.feedback.strengths.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noStrengths')}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {feedbackResult.feedback.strengths.map((strength, index) => (
                    <li key={`${strength}-${index}`}>• {strength}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('improvementsTitle')}</h3>
              {feedbackResult.feedback.improvements.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noImprovements')}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {feedbackResult.feedback.improvements.map((item, index) => (
                    <article key={`${item.title}-${index}`} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        <span
                          className={cn(
                            'inline-flex rounded border px-2 py-0.5 text-[11px] font-medium uppercase',
                            PRIORITY_STYLE[item.priority]
                          )}
                        >
                          {item.priority === 'high'
                            ? t('priorityHigh')
                            : item.priority === 'low'
                              ? t('priorityLow')
                              : t('priorityMedium')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
                      {item.actions.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {item.actions.map((action, actionIndex) => (
                            <li key={`${action}-${actionIndex}`}>• {action}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{t('selectedJobs', { count: feedbackResult.selectedJobCount })}</span>
            <span>{t('usedJobs', { count: feedbackResult.usedJobCount })}</span>
            <span>{feedbackResult.model}</span>
          </div>

          {feedbackResult.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('warningsTitle')}</p>
              <ul className="mt-1 space-y-1">
                {feedbackResult.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {editResult ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{t('editResultTitle')}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{t('selectedJobs', { count: editResult.selectedJobCount })}</span>
            <span>{t('usedJobs', { count: editResult.usedJobCount })}</span>
            <span>{editResult.model}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('changeLogTitle')}</h3>
              {editResult.changes.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noImprovements')}</p>
              ) : (
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {editResult.changes.map((change, index) => (
                    <article key={`${change.section}-${index}`} className="rounded-md border border-border p-3">
                      <h4 className="text-sm font-medium text-foreground">{change.section}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{change.reason}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="rounded bg-muted/40 px-2 py-1 text-muted-foreground">
                          <strong>{t('beforeLabel')}:</strong> {change.before}
                        </p>
                        <p className="rounded bg-primary/10 px-2 py-1 text-foreground">
                          <strong>{t('afterLabel')}:</strong> {change.after}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('updatedCvTitle')}</h3>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
                {editResult.document.parsedContent}
              </pre>
            </div>
          </div>

          {editResult.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('warningsTitle')}</p>
              <ul className="mt-1 space-y-1">
                {editResult.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
