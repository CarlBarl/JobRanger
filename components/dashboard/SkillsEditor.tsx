'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSkillsEditor } from '@/components/dashboard/hooks/useSkillsEditor'
import { BatchSkillsButton } from '@/components/dashboard/BatchSkillsButton'
import { BatchResultsModal } from '@/components/dashboard/BatchResultsModal'
import { useBatchSkillsRegeneration } from '@/components/dashboard/hooks/useBatchSkillsRegeneration'

interface SkillsEditorProps {
  skills: string[]
  documentId: string | null
  onSkillsChange?: (skills: string[]) => void
  className?: string
}

export function SkillsEditor({
  skills: initialSkills,
  documentId,
  onSkillsChange,
  className,
}: SkillsEditorProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const {
    skills,
    newSkill,
    setNewSkill,
    isAdding,
    setIsAdding,
    isSaving,
    removingSkill,
    inputRef,
    handleAddSkill,
    handleRemoveSkill,
    handleInputKeyDown,
  } = useSkillsEditor({ initialSkills, documentId, onSkillsChange })

  const {
    batchModalOpen,
    setBatchModalOpen,
    batchLoading,
    batchResults,
    handleBatchRegenerate,
  } = useBatchSkillsRegeneration()

  return (
    <div className={cn('card-elevated rounded-xl border bg-card p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-medium text-foreground/70">{t('skills.title')}</h2>
        <div className="flex items-center gap-3">
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('skills.saving')}
            </span>
          ) : null}
          <span className="text-[11px] tabular-nums text-muted-foreground/50">
            {t('skills.count', { count: skills.length })}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {skills.length === 0 && !isAdding ? (
          <p className="text-[13px] text-muted-foreground">{t('skills.noSkills')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" data-guide-id="dashboard-skills-list">
            {skills.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'group inline-flex items-center gap-1 rounded-md border px-2 py-0.5',
                  'bg-primary/[0.08] text-primary border-primary/[0.10]',
                  'text-[11px] font-medium transition-all duration-200 hover:bg-primary/[0.12]',
                  removingSkill === skill && 'scale-90 opacity-0'
                )}
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  data-guide-id="dashboard-skills-remove"
                  className={cn(
                    'rounded p-0.5 transition-all duration-200',
                    'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    'hover:text-destructive focus:outline-none'
                  )}
                  aria-label={t('skills.removeSkill', { skill })}
                  disabled={isSaving || removingSkill !== null}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3">
          {isAdding ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={() => {
                  if (!newSkill.trim()) setIsAdding(false)
                }}
                placeholder={t('skills.addPlaceholder')}
                className={cn(
                  'h-7 flex-1 rounded-md border bg-background px-2.5 text-[13px]',
                  'placeholder:text-muted-foreground/40',
                  'focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-primary/30',
                  'transition-all duration-200'
                )}
                autoFocus
                disabled={isSaving}
              />
              <button
                onClick={() => void handleAddSkill()}
                disabled={!newSkill.trim() || isSaving}
                className={cn(
                  'h-7 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground',
                  'hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed',
                  'transition-colors duration-200'
                )}
              >
                {t('skills.add')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsAdding(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              data-guide-id="dashboard-skills-add"
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-0.5',
                'text-[11px] font-medium text-muted-foreground/60',
                'hover:border-muted-foreground/30 hover:text-muted-foreground',
                'transition-all duration-200'
              )}
              disabled={isSaving}
            >
              <Plus className="h-2.5 w-2.5" />
              {t('skills.addNew')}
            </button>
          )}
        </div>

        {documentId ? (
          <div className="mt-3 flex justify-end">
            <BatchSkillsButton onTrigger={handleBatchRegenerate} loading={batchLoading} disabled={isSaving} />
          </div>
        ) : null}
      </div>

      <BatchResultsModal
        open={batchModalOpen}
        onClose={() => {
          setBatchModalOpen(false)
          router.refresh()
        }}
        results={batchResults}
      />
    </div>
  )
}
