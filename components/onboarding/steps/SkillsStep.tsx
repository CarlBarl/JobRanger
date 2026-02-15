'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { SkillsEditor } from '@/components/dashboard/SkillsEditor'

interface SkillsStepProps {
  documentId: string
  onComplete: (skills: string[]) => void
  onExtractionDone?: () => void
}

type ApiEnvelope = { success: boolean; data?: unknown; error?: { message?: string } }

const READING_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 1200

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getSkillsPayload(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  const skills = (data as { skills?: unknown }).skills
  if (!Array.isArray(skills)) return []
  return skills.filter((skill): skill is string => typeof skill === 'string')
}

export function SkillsStep({ documentId, onComplete, onExtractionDone }: SkillsStepProps) {
  const t = useTranslations('onboarding.skills')
  const [skills, setSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState<'reading' | 'extracting'>('reading')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const extractSkills = async () => {
      if (!active) return
      setLoading(true)
      setLoadingMessage('reading')

      try {
        // Short delay for "reading" message
        await new Promise((r) => setTimeout(r, READING_DELAY_MS))
        if (!active || controller.signal.aborted) return
        setLoadingMessage('extracting')

        const response = await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
          signal: controller.signal,
        })

        const json: unknown = await response.json()
        if (isApiEnvelope(json) && json.success) {
          const extracted = getSkillsPayload(json.data)
          if (active) {
            setSkills(extracted)
          }
          return
        }

        // Fallback: load existing skills for this document
        const skillsResponse = await fetch(
          `/api/skills?documentId=${encodeURIComponent(documentId)}`,
          { signal: controller.signal }
        )
        const skillsJson: unknown = await skillsResponse.json()
        if (isApiEnvelope(skillsJson) && skillsJson.success) {
          const stored = getSkillsPayload(skillsJson.data)
          if (active) {
            setSkills(stored)
          }
        }
      } catch {
        // Skills might already exist or the request was aborted
      } finally {
        if (!active || controller.signal.aborted) return
        setLoading(false)
        onExtractionDone?.()
      }
    }

    void extractSkills()

    return () => {
      active = false
      controller.abort()
    }
  }, [documentId, onExtractionDone])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-[14px] text-stone-500 animate-pulse">
          {t(loadingMessage)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      {/* Guide */}
      <p className="text-center text-[13px] text-stone-600 leading-relaxed">
        {t('guide')}
      </p>

      <div className="w-full">
        <SkillsEditor
          skills={skills}
          documentId={documentId}
          onSkillsChange={setSkills}
        />
      </div>

      {/* Tip */}
      <p className="text-center text-[12px] text-stone-500 leading-relaxed">
        {t('tip')}
      </p>

      {/* Continue */}
      <button
        onClick={() => onComplete(skills)}
        className="h-11 rounded-xl bg-amber-600 px-8 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500"
      >
        {t('continue')}
      </button>
    </div>
  )
}
