'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertCircle, Plus, Minus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface BatchResults {
  total: number
  updated: Array<{
    documentId: string
    previousSkills: string[]
    newSkills: string[]
    added: string[]
    removed: string[]
    createdAt: string
  }>
  failed: Array<{
    documentId: string
    error: string
    createdAt: string
  }>
  skipped: Array<{
    documentId: string
    reason: string
    createdAt: string
  }>
}

interface BatchResultsModalProps {
  open: boolean
  onClose: () => void
  results: BatchResults | null
}

export function BatchResultsModal({
  open,
  onClose,
  results
}: BatchResultsModalProps) {
  const t = useTranslations()
  const router = useRouter()

  const handleClose = () => {
    onClose()
    router.refresh()
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dashboard.batchResults.title')}</DialogTitle>
          <DialogDescription>
            {results ? (
              t('dashboard.batchResults.summary', {
                updated: results.updated.length,
                total: results.total
              })
            ) : (
              t('dashboard.batchResults.noResults')
            )}
          </DialogDescription>
        </DialogHeader>

        {results && results.total > 0 && (
          <div className="space-y-6">
            {/* Successfully Updated Section */}
            {results.updated.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  {t('dashboard.batchResults.updated')}
                </h3>
                <ul className="space-y-3">
                  {results.updated.map((item) => (
                    <li
                      key={item.documentId}
                      className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {(item.previousSkills ?? []).length} → {(item.newSkills ?? []).length} {t('dashboard.batchResults.skills')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {/* Added skills */}
                      {(item.added ?? []).length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                            <Plus className="h-3 w-3" />
                            {t('dashboard.batchResults.added')} ({(item.added ?? []).length})
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(item.added ?? []).map((skill, i) => (
                              <span
                                key={i}
                                className="rounded bg-green-200 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-800 dark:text-green-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Removed skills */}
                      {(item.removed ?? []).length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300">
                            <Minus className="h-3 w-3" />
                            {t('dashboard.batchResults.removed')} ({(item.removed ?? []).length})
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(item.removed ?? []).map((skill, i) => (
                              <span
                                key={i}
                                className="rounded bg-red-200 px-1.5 py-0.5 text-xs text-red-800 line-through dark:bg-red-800 dark:text-red-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* No changes */}
                      {(item.added ?? []).length === 0 && (item.removed ?? []).length === 0 && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          {t('dashboard.batchResults.noChanges')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failed Section */}
            {results.failed.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  {t('dashboard.batchResults.failed')}
                </h3>
                <ul className="space-y-2">
                  {results.failed.map((item, index) => (
                    <li
                      key={item.documentId}
                      className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-red-700 dark:text-red-300">
                          CV {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                        {item.error}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skipped Section */}
            {results.skipped.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  <AlertCircle className="h-4 w-4" />
                  {t('dashboard.batchResults.skipped')}
                </h3>
                <ul className="space-y-2">
                  {results.skipped.map((item, index) => (
                    <li
                      key={item.documentId}
                      className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">
                          CV {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.reason}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {results && results.total === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('dashboard.batchResults.noResults')}
          </p>
        )}

        <DialogFooter>
          <Button onClick={handleClose}>
            {t('dashboard.batchResults.closeAndRefresh')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
