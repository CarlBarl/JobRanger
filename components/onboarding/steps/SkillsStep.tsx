'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus } from 'lucide-react'

interface SkillsStepProps {
  documentId: string
  onComplete: (skills: string[]) => void
}

export function SkillsStep({ documentId, onComplete }: SkillsStepProps) {
  const t = useTranslations('onboarding.skills')
  const [skills, setSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState<'reading' | 'extracting'>('reading')
  const [newSkill, setNewSkill] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const extractSkills = useCallback(async () => {
    setLoading(true)
    setLoadingMessage('reading')

    try {
      // Short delay for "reading" message
      await new Promise((r) => setTimeout(r, 1200))
      setLoadingMessage('extracting')

      const response = await fetch('/api/skills/batch', { method: 'POST' })
      const data = await response.json()

      if (data.success && data.data?.updated?.length > 0) {
        setSkills(data.data.updated[0].newSkills || [])
      } else {
        // Fallback: try to load existing skills from document
        const docResponse = await fetch(`/api/documents/${documentId}`)
        const docData = await docResponse.json()
        if (docData.success && docData.data?.skills) {
          setSkills(docData.data.skills)
        }
      }
    } catch {
      // Skills might already exist
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    extractSkills()
  }, [extractSkills])

  const handleAddSkill = () => {
    const trimmed = newSkill.trim()
    if (!trimmed || skills.includes(trimmed)) {
      setNewSkill('')
      return
    }

    const updated = [...skills, trimmed]
    setSkills(updated)
    setNewSkill('')
    setIsAdding(false)

    // Save to backend
    void fetch('/api/skills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, skills: updated }),
    })
  }

  const handleRemoveSkill = (skill: string) => {
    const updated = skills.filter((s) => s !== skill)
    setSkills(updated)

    void fetch('/api/skills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, skills: updated }),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSkill()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewSkill('')
    }
  }

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
      {/* Skills tags */}
      <div className="w-full rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        {skills.length === 0 ? (
          <p className="text-[13px] text-stone-500 text-center">
            No skills found. Try adding some manually.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200/60 px-2.5 py-1 text-[12px] font-medium text-stone-700 transition-all duration-200 hover:bg-stone-200/70"
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="rounded p-0.5 text-stone-400 transition-colors hover:text-red-500 opacity-0 group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add skill */}
        <div className="mt-3">
          {isAdding ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newSkill.trim()) setIsAdding(false)
                }}
                placeholder="Type a skill..."
                className="h-8 flex-1 rounded-lg border border-stone-300/60 bg-white px-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                autoFocus
              />
              <button
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
                className="h-8 rounded-lg bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-500 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-2.5 py-1 text-[11px] font-medium text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-all"
            >
              <Plus className="h-2.5 w-2.5" />
              Add skill
            </button>
          )}
        </div>
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
