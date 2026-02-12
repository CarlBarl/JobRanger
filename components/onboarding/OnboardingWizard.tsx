'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { WizardOrb } from './WizardOrb'
import { WizardProgress } from './WizardProgress'
import { WelcomeStep } from './steps/WelcomeStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { SkillsStep } from './steps/SkillsStep'
import { JobPreviewStep } from './steps/JobPreviewStep'
import { CompletionStep } from './steps/CompletionStep'

interface OnboardingWizardProps {
  userName: string | null
}

type OrbState = 'idle' | 'thinking' | 'celebrating'

const TOTAL_STEPS = 5

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const t = useTranslations('onboarding')

  const [step, setStep] = useState(0)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transitioning, setTransitioning] = useState(false)

  // Accumulated data across steps
  const [name, setName] = useState(userName || '')
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [savedJobsCount, setSavedJobsCount] = useState(0)

  const goToStep = (nextStep: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setStep(nextStep)
      setTransitioning(false)
    }, 300)
  }

  // Orb message for each step
  const orbMessage = useMemo(() => {
    switch (step) {
      case 0:
        return name
          ? t('welcome.namePrompt')
          : t('welcome.greeting')
      case 1:
        return t('documents.cvPrompt')
      case 2:
        return orbState === 'thinking'
          ? t('skills.extracting')
          : t('skills.found')
      case 3:
        return t('jobs.results')
      case 4:
        return t('completion.message')
      default:
        return ''
    }
  }, [step, name, orbState, t])

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-[#FAF7F2]">
      {/* Ambient glow — soft blue halo from the orb */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(ellipse 500px 350px at 50% 20%, rgba(99, 130, 255, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* Progress bar */}
      <div className="w-full px-6 pt-6">
        <WizardProgress currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12 w-full">
        {/* Orb + message */}
        <div className="mb-10">
          <WizardOrb
            message={orbMessage}
            state={orbState}
          />
        </div>

        {/* Step content with transition */}
        <div
          className={`w-full flex justify-center transition-all duration-300 ${
            transitioning
              ? 'opacity-0 translate-y-2'
              : 'opacity-100 translate-y-0'
          }`}
        >
          {step === 0 && (
            <WelcomeStep
              initialName={userName}
              onComplete={(n) => {
                setName(n)
                goToStep(1)
              }}
            />
          )}

          {step === 1 && (
            <DocumentsStep
              onComplete={(docId) => {
                setCvDocumentId(docId)
                setOrbState('thinking')
                goToStep(2)
              }}
            />
          )}

          {step === 2 && (
            <SkillsStep
              documentId={cvDocumentId!}
              onComplete={(extractedSkills) => {
                setSkills(extractedSkills)
                setOrbState('idle')
                goToStep(3)
              }}
            />
          )}

          {step === 3 && (
            <JobPreviewStep
              skills={skills}
              onComplete={(count) => {
                setSavedJobsCount(count)
                setOrbState('celebrating')
                goToStep(4)
              }}
            />
          )}

          {step === 4 && (
            <CompletionStep
              name={name}
              skillsCount={skills.length}
              savedJobsCount={savedJobsCount}
            />
          )}
        </div>
      </div>
    </div>
  )
}
