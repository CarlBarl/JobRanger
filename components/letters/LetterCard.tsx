'use client'

import Link from 'next/link'
import { Briefcase, ChevronDown, ChevronUp, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LetterListItem } from './types'

export type LetterCardLabels = {
  copy: string
  copied: string
  delete: string
  deleting: string
  showLess: string
  showMore: string
  viewJob: string
  viewListing: string
}

type LetterCardProps = {
  copiedId: string | null
  copyGuideId?: string
  createdLabel: string
  deletingId: string | null
  excerpt: string
  hasExternalLink: boolean
  isExpanded: boolean
  isTruncated: boolean
  labels: LetterCardLabels
  letter: LetterListItem
  metaLine: string | null
  onCopy: (letter: LetterListItem) => void
  onDelete: (letter: LetterListItem) => void
  onToggleExpanded: (id: string) => void
  title: string
}

export function LetterCard({
  copiedId,
  copyGuideId,
  createdLabel,
  deletingId,
  excerpt,
  hasExternalLink,
  isExpanded,
  isTruncated,
  labels,
  letter,
  metaLine,
  onCopy,
  onDelete,
  onToggleExpanded,
  title,
}: LetterCardProps) {
  return (
    <Card
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
              <Link href={`/jobs/${letter.afJobId}`} aria-label={labels.viewJob}>
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">{labels.viewJob}</span>
              </Link>
            </Button>

            {hasExternalLink ? (
              <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                <a
                  href={letter.savedJob?.webpageUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={labels.viewListing}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">{labels.viewListing}</span>
                </a>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onCopy(letter)}
              disabled={Boolean(deletingId)}
              data-guide-id={copyGuideId}
              aria-label={copiedId === letter.id ? labels.copied : labels.copy}
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">
                {copiedId === letter.id ? labels.copied : labels.copy}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 text-destructive hover:text-destructive', deletingId === letter.id && 'opacity-60')}
              onClick={() => onDelete(letter)}
              disabled={Boolean(deletingId)}
              aria-label={deletingId === letter.id ? labels.deleting : labels.delete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {deletingId === letter.id ? labels.deleting : labels.delete}
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
            onClick={() => onToggleExpanded(letter.id)}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            aria-label={isExpanded ? labels.showLess : labels.showMore}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {labels.showLess}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {labels.showMore}
              </>
            )}
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}
