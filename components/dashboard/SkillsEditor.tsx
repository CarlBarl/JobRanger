'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillsEditorProps {
  skills: string[]
  documentId: string | null
  onSkillsChange?: (skills: string[]) => void
  className?: string
}

export function SkillsEditor({
  skills: initialSkills,
  documentId,
  onSkillsChange,
  className
}: SkillsEditorProps) {
  const t = useTranslations('dashboard')
  const [skills, setSkills] = useState<string[]>(initialSkills)
  const [newSkill, setNewSkill] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [removingSkill, setRemovingSkill] = useState<string | null>(null)
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  const saveSkills = async (
    newSkills: string[],
    previousSkills: string[]
  ) => {
    if (!documentId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, skills: newSkills })
      })

      if (!response.ok) {
        throw new Error('Failed to save skills')
      }

      onSkillsChange?.(newSkills)
    } catch (error) {
      console.error('Failed to save skills:', error)
      setSkills(previousSkills)
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
    const newSkills = [...skills, trimmed]
    setSkills(newSkills)
    setRecentlyAdded(trimmed)
    setNewSkill('')
    setIsAdding(false)

    setTimeout(() => setRecentlyAdded(null), 600)

    await saveSkills(newSkills, previousSkills)
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    if (removingSkill || isSaving) return

    setRemovingSkill(skillToRemove)

    setTimeout(() => {
      setSkills((previousSkills) => {
        const newSkills = previousSkills.filter(s => s !== skillToRemove)
        void saveSkills(newSkills, previousSkills)
        return newSkills
      })
      setRemovingSkill(null)
    }, 150)
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

  return (
    <div className={cn('card-elevated rounded-[10px] border bg-card p-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t('skills.title')}
        </h2>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('skills.saving')}
            </span>
          )}
          <span className="text-[11px] tabular-nums text-muted-foreground/50">
            {t('skills.count', { count: skills.length })}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {skills.length === 0 && !isAdding ? (
          <p className="text-[13px] text-muted-foreground">
            {t('skills.noSkills')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'group inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5',
                  'text-[11px] font-medium text-muted-foreground',
                  'transition-all duration-200',
                  'hover:bg-secondary',
                  removingSkill === skill && 'scale-90 opacity-0'
                )}
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className={cn(
                    'rounded p-0.5 transition-all duration-200',
                    'text-muted-foreground/30 hover:text-destructive',
                    'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    'focus:outline-none'
                  )}
                  aria-label={t('skills.removeSkill', { skill })}
                  disabled={isSaving || removingSkill !== null}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3">
          {isAdding ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newSkill.trim()) setIsAdding(false)
                }}
                placeholder={t('skills.addPlaceholder')}
                className={cn(
                  'h-7 flex-1 rounded-md border bg-background px-2.5 text-[13px]',
                  'placeholder:text-muted-foreground/40',
                  'focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-primary/30',
                  'transition-all duration-200'
                )}
                autoFocus
                disabled={isSaving}
              />
              <button
                onClick={handleAddSkill}
                disabled={!newSkill.trim() || isSaving}
                className={cn(
                  'h-7 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground',
                  'hover:bg-primary/90',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'transition-colors duration-200'
                )}
              >
                {t('skills.add')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsAdding(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-0.5',
                'text-[11px] font-medium text-muted-foreground/60',
                'hover:border-muted-foreground/30 hover:text-muted-foreground',
                'transition-all duration-200'
              )}
              disabled={isSaving}
            >
              <Plus className="h-2.5 w-2.5" />
              {t('skills.addNew')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
