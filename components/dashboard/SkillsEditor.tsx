'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Sync with parent
  useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  const saveSkills = async (newSkills: string[]) => {
    if (!documentId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, skills: newSkills })
      })

      if (response.ok) {
        onSkillsChange?.(newSkills)
      }
    } catch (error) {
      console.error('Failed to save skills:', error)
      // Revert on error
      setSkills(initialSkills)
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

    const newSkills = [...skills, trimmed]
    setSkills(newSkills)
    setRecentlyAdded(trimmed)
    setNewSkill('')
    setIsAdding(false)

    // Clear the "recently added" highlight after animation
    setTimeout(() => setRecentlyAdded(null), 600)

    await saveSkills(newSkills)
  }

  const handleRemoveSkill = async (skillToRemove: string) => {
    setRemovingSkill(skillToRemove)

    // Wait for exit animation
    setTimeout(async () => {
      const newSkills = skills.filter(s => s !== skillToRemove)
      setSkills(newSkills)
      setRemovingSkill(null)
      await saveSkills(newSkills)
    }, 200)
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
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t('skills.title')}
          </span>
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('skills.saving')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {skills.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground mb-3">
            {t('skills.noSkills')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'group relative inline-flex items-center gap-1 rounded-full px-3 py-1.5',
                  'text-sm font-medium transition-all duration-200',
                  'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900',
                  'border border-slate-200 dark:border-slate-700',
                  'shadow-sm hover:shadow-md',
                  'hover:border-slate-300 dark:hover:border-slate-600',
                  // Exit animation
                  removingSkill === skill && 'scale-75 opacity-0',
                  // Enter animation
                  recentlyAdded === skill && 'animate-skill-pop'
                )}
              >
                <span className="select-none">{skill}</span>
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className={cn(
                    'ml-0.5 rounded-full p-0.5 transition-all duration-150',
                    'text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400',
                    'hover:bg-red-50 dark:hover:bg-red-950',
                    'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    'focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800'
                  )}
                  aria-label={t('skills.removeSkill', { skill })}
                  disabled={isSaving}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add skill input */}
        {isAdding ? (
          <div className="flex gap-2 animate-skill-fade-in">
            <input
              ref={inputRef}
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newSkill.trim()) {
                  setIsAdding(false)
                }
              }}
              placeholder={t('skills.addPlaceholder')}
              className={cn(
                'flex-1 h-9 rounded-full px-4 text-sm',
                'border border-slate-200 dark:border-slate-700',
                'bg-white dark:bg-slate-900',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700',
                'focus:border-slate-300 dark:focus:border-slate-600',
                'transition-all duration-200'
              )}
              autoFocus
              disabled={isSaving}
            />
            <button
              onClick={handleAddSkill}
              disabled={!newSkill.trim() || isSaving}
              className={cn(
                'h-9 px-4 rounded-full text-sm font-medium',
                'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
                'hover:bg-slate-800 dark:hover:bg-slate-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2'
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
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
              'text-sm font-medium text-slate-500 dark:text-slate-400',
              'border border-dashed border-slate-300 dark:border-slate-600',
              'hover:border-slate-400 dark:hover:border-slate-500',
              'hover:text-slate-600 dark:hover:text-slate-300',
              'hover:bg-slate-50 dark:hover:bg-slate-800',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700'
            )}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4" />
            {t('skills.addNew')}
          </button>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          {t('skills.count', { count: skills.length })}
        </p>
      </CardContent>

      {/* Inline styles for animations */}
      <style jsx global>{`
        @keyframes skill-pop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes skill-fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-skill-pop {
          animation: skill-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-skill-fade-in {
          animation: skill-fade-in 0.2s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-skill-pop,
          .animate-skill-fade-in {
            animation: none;
          }
        }
      `}</style>
    </Card>
  )
}
