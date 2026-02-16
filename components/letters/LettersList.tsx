'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { CopyToast } from './CopyToast'
import { LetterCard, type LetterCardLabels } from './LetterCard'
import type { LetterListItem } from './types'
import { buildExcerpt, copyTextToClipboard } from './utils'

export function LettersList({
  initialLetters,
  activeJobId,
}: {
  initialLetters: LetterListItem[]
  activeJobId?: string
}) {
  const t = useTranslations('letters')
  const locale = useLocale()
  const router = useRouter()
  const [letters, setLetters] = useState<LetterListItem[]>(initialLetters)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingDeleteRef = useRef<{ letter: LetterListItem; index: number } | null>(null)

  useEffect(() => {
    setLetters(initialLetters)
  }, [initialLetters])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale]
  )

  const labels: LetterCardLabels = useMemo(
    () => ({
      copy: t('copy'),
      copied: t('copied'),
      delete: t('delete'),
      deleting: t('deleting'),
      showLess: t('showLess'),
      showMore: t('showMore'),
      viewJob: t('viewJob'),
      viewListing: t('viewListing'),
    }),
    [t]
  )

  const resolveTitle = useCallback(
    (letter: LetterListItem) =>
      letter.savedJob?.headline?.trim() ||
      letter.jobTitle?.trim() ||
      t('unknownJobTitle'),
    [t]
  )

  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleCopy = useCallback(
    async (letter: LetterListItem) => {
      setError(null)
      try {
        await copyTextToClipboard(letter.content)
        setCopiedId(letter.id)
        window.setTimeout(() => {
          setCopiedId((current) => (current === letter.id ? null : current))
        }, 1500)
      } catch {
        setError(t('copyFailed'))
      }
    },
    [t]
  )

  const handleDelete = useCallback(
    async (letter: LetterListItem) => {
      if (deletingId) return
      const confirmed = window.confirm(t('confirmDelete', { title: resolveTitle(letter) }))
      if (!confirmed) return

      setError(null)
      setDeletingId(letter.id)

      const index = letters.findIndex((item) => item.id === letter.id)
      pendingDeleteRef.current = { letter, index }
      setLetters((prev) => prev.filter((item) => item.id !== letter.id))

      try {
        const res = await fetch(`/api/letters/${letter.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        router.refresh()
      } catch {
        const pending = pendingDeleteRef.current
        if (pending) {
          setLetters((prev) => {
            if (prev.some((item) => item.id === pending.letter.id)) return prev
            const next = [...prev]
            const insertAt = Math.min(Math.max(pending.index, 0), next.length)
            next.splice(insertAt, 0, pending.letter)
            return next
          })
        }
        setError(t('deleteFailed'))
      } finally {
        pendingDeleteRef.current = null
        setDeletingId(null)
      }
    },
    [deletingId, letters, resolveTitle, router, t]
  )

  return (
    <div className="space-y-8">
      <CopyToast copiedId={copiedId} label={t('copiedToast')} />

      <div className="animate-fade-up">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t('count', { count: letters.length })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        {activeJobId ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t('filteredByJob', { jobId: activeJobId })}</span>
            <Link href="/letters" className="font-medium text-primary hover:underline">
              {t('showAll')}
            </Link>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {letters.length === 0 ? (
        <div className="animate-fade-up delay-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full border p-4">
            <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground">
            {activeJobId ? t('emptyForJob') : t('empty')}
          </p>
        </div>
      ) : (
        <div className="animate-fade-up delay-1 space-y-4">
          {letters.map((letter, index) => {
            const title = resolveTitle(letter)
            const createdLabel = dateFormatter.format(new Date(letter.createdAt))
            const metaBits = [
              letter.savedJob?.employer?.trim() || null,
              letter.savedJob?.location?.trim() || null,
            ].filter(Boolean)
            const metaLine = metaBits.length > 0 ? metaBits.join(' · ') : null
            const isExpanded = expandedIds.has(letter.id)
            const { excerpt, isTruncated } = buildExcerpt(letter.content)
            const hasExternalLink = Boolean(letter.savedJob?.webpageUrl?.trim())

            return (
              <LetterCard
                key={letter.id}
                copiedId={copiedId}
                copyGuideId={index === 0 ? 'letters-first-copy' : undefined}
                createdLabel={createdLabel}
                deletingId={deletingId}
                excerpt={excerpt}
                hasExternalLink={hasExternalLink}
                isExpanded={isExpanded}
                isTruncated={isTruncated}
                labels={labels}
                letter={letter}
                metaLine={metaLine}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onToggleExpanded={handleToggleExpanded}
                title={title}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export type { LetterListItem } from './types'
