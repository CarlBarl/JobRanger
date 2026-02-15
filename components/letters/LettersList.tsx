'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronDown, ChevronUp, Copy, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type LetterListItem = {
  id: string
  afJobId: string
  jobTitle: string | null
  content: string
  createdAt: string
  savedJob?: {
    headline: string | null
    employer: string | null
    location: string | null
    deadline: string | null
    webpageUrl: string | null
  } | null
}

function buildExcerpt(value: string, maxChars = 380): { excerpt: string; isTruncated: boolean } {
  const text = value.trim()
  if (text.length <= maxChars) return { excerpt: text, isTruncated: false }

  const hardLimit = Math.max(0, maxChars - 3)
  const slice = text.slice(0, hardLimit)
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '))
  const cutoff = lastBreak > Math.floor(hardLimit * 0.6) ? lastBreak : hardLimit
  return { excerpt: `${slice.slice(0, cutoff).trimEnd()}...`, isTruncated: true }
}

async function copyTextToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) {
    throw new Error('Copy failed')
  }
}

export function LettersList({ initialLetters }: { initialLetters: LetterListItem[] }) {
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

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }, [locale])

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
        if (!res.ok) {
          throw new Error('Delete failed')
        }
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
      <div className="animate-fade-up">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t('count', { count: letters.length })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {letters.length === 0 ? (
        <div className="animate-fade-up delay-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full border p-4">
            <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="animate-fade-up delay-1 space-y-4">
          {letters.map((letter) => {
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
              <Card
                key={letter.id}
                className="group overflow-hidden transition-shadow hover:shadow-md"
                data-testid={`letter-${letter.id}`}
              >
                <CardHeader className="border-b bg-muted/30 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="break-words text-base font-semibold tracking-tight">
                        <Link href={`/jobs/${letter.afJobId}`} className="hover:underline">
                          {title}
                        </Link>
                      </CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {metaLine ? <span className="truncate">{metaLine}</span> : null}
                        <span className="font-mono tabular-nums">{createdLabel}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                        <Link href={`/jobs/${letter.afJobId}`} aria-label={t('viewJob')}>
                          <Briefcase className="h-4 w-4" />
                          <span className="hidden sm:inline">{t('viewJob')}</span>
                        </Link>
                      </Button>

                      {hasExternalLink ? (
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                          <a
                            href={letter.savedJob?.webpageUrl ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t('viewListing')}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('viewListing')}</span>
                          </a>
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleCopy(letter)}
                        disabled={Boolean(deletingId)}
                        aria-label={copiedId === letter.id ? t('copied') : t('copy')}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {copiedId === letter.id ? t('copied') : t('copy')}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn('h-8 px-2 text-destructive hover:text-destructive', deletingId === letter.id && 'opacity-60')}
                        onClick={() => handleDelete(letter)}
                        disabled={Boolean(deletingId)}
                        aria-label={deletingId === letter.id ? t('deleting') : t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {deletingId === letter.id ? t('deleting') : t('delete')}
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {isExpanded ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {letter.content}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {excerpt}
                    </p>
                  )}

                  {isTruncated ? (
                    <button
                      type="button"
                      onClick={() => handleToggleExpanded(letter.id)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                      aria-label={isExpanded ? t('showLess') : t('showMore')}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          {t('showLess')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          {t('showMore')}
                        </>
                      )}
                    </button>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
