'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { LetterListItem } from './types'

type MutationResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

type LetterEditDialogProps = {
  open: boolean
  letter: LetterListItem | null
  canUseAiHone: boolean
  onOpenChange: (open: boolean) => void
  onSave: (letterId: string, content: string) => Promise<MutationResult>
  onHone: (letterId: string, content: string, followUpPrompt: string) => Promise<MutationResult>
}

const MAX_FOLLOW_UP_PROMPT_CHARS = 1200

export function LetterEditDialog({
  open,
  letter,
  canUseAiHone,
  onOpenChange,
  onSave,
  onHone,
}: LetterEditDialogProps) {
  const t = useTranslations('letters')
  const [contentDraft, setContentDraft] = useState('')
  const [followUpPrompt, setFollowUpPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [honing, setHoning] = useState(false)

  useEffect(() => {
    if (!open || !letter) return
    setContentDraft(letter.content)
    setFollowUpPrompt('')
    setError(null)
    setSaving(false)
    setHoning(false)
  }, [open, letter])

  const dirty = useMemo(
    () => Boolean(letter && contentDraft !== letter.content),
    [contentDraft, letter]
  )

  const trimmedContent = contentDraft.trim()
  const trimmedFollowUp = followUpPrompt.trim()
  const saveDisabled = !letter || !dirty || !trimmedContent || saving || honing
  const honeDisabled = !letter || !trimmedContent || !trimmedFollowUp || saving || honing || !canUseAiHone

  const handleSave = async () => {
    if (!letter || saveDisabled) return
    setError(null)
    setSaving(true)
    try {
      const result = await onSave(letter.id, contentDraft)
      if (!result.ok) {
        setError(result.error || t('editSaveFailed'))
        return
      }
      setContentDraft(result.content)
    } finally {
      setSaving(false)
    }
  }

  const handleHone = async () => {
    if (!letter || honeDisabled) return
    setError(null)
    setHoning(true)
    try {
      const result = await onHone(letter.id, contentDraft, followUpPrompt)
      if (!result.ok) {
        setError(result.error || t('honeFailed'))
        return
      }
      setContentDraft(result.content)
      setFollowUpPrompt('')
    } finally {
      setHoning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editDialogTitle')}</DialogTitle>
          <DialogDescription>{t('editDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="letter-edit-content"
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            {t('letterBodyLabel')}
          </label>
          <textarea
            id="letter-edit-content"
            value={contentDraft}
            onChange={(event) => setContentDraft(event.target.value)}
            className="min-h-[260px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t('editPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="letter-edit-follow-up"
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            {t('followUpPromptLabel')}
          </label>
          <textarea
            id="letter-edit-follow-up"
            value={followUpPrompt}
            onChange={(event) => setFollowUpPrompt(event.target.value)}
            maxLength={MAX_FOLLOW_UP_PROMPT_CHARS}
            rows={4}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t('followUpPromptPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('followUpPromptHint', { count: MAX_FOLLOW_UP_PROMPT_CHARS - followUpPrompt.length })}
          </p>
        </div>

        {!canUseAiHone ? (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p>{t('honeProOnly')}</p>
            <Link href="/pricing" className="font-medium text-amber-700 underline-offset-2 hover:underline">
              {t('honeUpgradeCta')}
            </Link>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {contentDraft.length.toLocaleString()} {t('characters')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || honing}>
              {t('closeEditor')}
            </Button>
            <Button variant="secondary" onClick={handleSave} disabled={saveDisabled}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('savingEdit')}
                </>
              ) : (
                t('saveEdit')
              )}
            </Button>
            <Button onClick={handleHone} disabled={honeDisabled} className="gap-2">
              {honing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {honing ? t('honing') : t('honeWithAi')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
