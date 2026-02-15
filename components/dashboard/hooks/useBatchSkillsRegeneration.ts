'use client'

import { useState } from 'react'

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

export function useBatchSkillsRegeneration() {
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResults, setBatchResults] = useState<BatchResults | null>(null)

  const handleBatchRegenerate = async () => {
    setBatchLoading(true)

    try {
      const response = await fetch('/api/skills/batch', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setBatchResults(data.data)
        setBatchModalOpen(true)
      } else {
        console.error('Batch skills update failed:', data.error)
      }
    } catch (error) {
      console.error('Batch skills update error:', error)
    } finally {
      setBatchLoading(false)
    }
  }

  return {
    batchModalOpen,
    setBatchModalOpen,
    batchLoading,
    batchResults,
    handleBatchRegenerate,
  }
}
