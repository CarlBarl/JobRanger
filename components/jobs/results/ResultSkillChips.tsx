'use client'

import { normalizeSkillKey } from '@/lib/skills/normalize'

interface ResultSkillChipsProps {
  jobId: string
  extractedSkills: string[]
  matchedSkills: string[]
  expanded: boolean
  labels: {
    show: string
    hide: string
    empty: string
  }
  onToggle: (jobId: string) => void
}

export function ResultSkillChips({
  jobId,
  extractedSkills,
  matchedSkills,
  expanded,
  labels,
  onToggle,
}: ResultSkillChipsProps) {
  const matchedSkillSet = new Set(matchedSkills.map((skill) => normalizeSkillKey(skill)))
  const hasExtractedSkills = extractedSkills.length > 0

  return (
    <div className="mt-2 space-y-2 px-1">
      <button
        type="button"
        onClick={() => onToggle(jobId)}
        className="text-[11px] font-medium text-primary hover:underline"
      >
        {expanded ? labels.hide : labels.show}
      </button>

      {expanded ? (
        hasExtractedSkills ? (
          <div className="flex flex-wrap gap-1.5" data-testid={`job-skills-${jobId}`}>
            {extractedSkills.map((skill) => {
              const isMatched = matchedSkillSet.has(normalizeSkillKey(skill))

              return (
                <span
                  key={`${jobId}-${skill}`}
                  className={
                    isMatched
                      ? 'inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'
                      : 'inline-flex items-center rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
                  }
                >
                  {skill}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{labels.empty}</p>
        )
      ) : null}
    </div>
  )
}
