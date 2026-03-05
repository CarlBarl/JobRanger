'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface UseSkillsEditorParams {
  initialSkills: string[]
  documentId: string | null
  onSkillsChange?: (skills: string[]) => void
  messages: {
    saved: string
    saveFailed: string
  }
}

export function useSkillsEditor({
  initialSkills,
  documentId,
  onSkillsChange,
  messages,
}: UseSkillsEditorParams) {
  const [skills, setSkills] = useState<string[]>(initialSkills)
  const [newSkill, setNewSkill] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [removingSkill, setRemovingSkill] = useState<string | null>(null)
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  const saveSkills = async (nextSkills: string[], previousSkills: string[]) => {
    if (!documentId) return

    setIsSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, skills: nextSkills }),
      })

      if (!response.ok) {
        throw new Error('Failed to save skills')
      }

      onSkillsChange?.(nextSkills)
      setFeedback({ tone: 'success', message: messages.saved })
    } catch {
      setSkills(previousSkills)
      setFeedback({ tone: 'error', message: messages.saveFailed })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSkill = async () => {
    const trimmed = newSkill.trim()
    if (!trimmed || skills.includes(trimmed)) {
      setNewSkill('')
      return
    }

    const previousSkills = skills
    const nextSkills = [...skills, trimmed]
    setSkills(nextSkills)
    setRecentlyAdded(trimmed)
    setNewSkill('')
    setIsAdding(false)

    setTimeout(() => setRecentlyAdded(null), 600)
    await saveSkills(nextSkills, previousSkills)
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    if (removingSkill || isSaving) return

    setRemovingSkill(skillToRemove)
    setTimeout(() => {
      setSkills((previousSkills) => {
        const nextSkills = previousSkills.filter((skill) => skill !== skillToRemove)
        void saveSkills(nextSkills, previousSkills)
        return nextSkills
      })
      setRemovingSkill(null)
    }, 150)
  }

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleAddSkill()
      return
    }

    if (event.key === 'Escape') {
      setIsAdding(false)
      setNewSkill('')
    }
  }

  return {
    skills,
    setSkills,
    newSkill,
    setNewSkill,
    isAdding,
    setIsAdding,
    isSaving,
    removingSkill,
    recentlyAdded,
    feedback,
    inputRef,
    handleAddSkill,
    handleRemoveSkill,
    handleInputKeyDown,
  }
}
