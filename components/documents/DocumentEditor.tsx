'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface DocumentEditorProps {
  document: {
    id: string
    type: 'cv' | 'personal_letter'
    parsedContent: string | null
    fileUrl: string | null
    createdAt: string
  }
}

export function DocumentEditor({ document }: DocumentEditorProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [content, setContent] = useState(document.parsedContent || '')
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = content !== (document.parsedContent || '')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedContent: content }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        console.error('Failed to save document:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Network error while saving document:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const typeLabel = document.type === 'cv' ? t('yourCV') : t('yourPersonalLetter')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToDashboard')}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('uploadNewFile')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>
      </header>

      {/* Document info bar */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-2 flex items-center gap-4 text-sm">
          <span className="font-medium">{typeLabel}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {t('lastUpdated')}: {document.createdAt}
          </span>
          {isDirty && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-orange-600 dark:text-orange-400">
                {t('unsavedChanges')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Split pane editor */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Editor pane */}
          <div className="flex flex-col">
            <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              {t('edit')}
            </h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label={t('edit')}
              className="flex-1 w-full p-4 font-mono text-sm bg-muted rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('noContent')}
            />
          </div>

          {/* Preview pane */}
          <div className="flex flex-col">
            <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              {t('preview')}
            </h2>
            <div className="flex-1 p-4 bg-card rounded-lg border overflow-auto">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {content || t('noContent')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
