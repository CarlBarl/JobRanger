'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface WizardOrbProps {
  message?: string
  state?: 'idle' | 'thinking' | 'celebrating'
  className?: string
}

export function WizardOrb({
  message,
  state = 'idle',
  className,
}: WizardOrbProps) {
  const [isCelebrating, setIsCelebrating] = useState(false)

  useEffect(() => {
    if (state === 'celebrating') {
      setIsCelebrating(true)
      const timer = setTimeout(() => setIsCelebrating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [state])

  return (
    <>
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        @keyframes orb-think {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.06) rotate(180deg); }
        }

        @keyframes orb-celebrate {
          0% { transform: scale(1); }
          40% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        @keyframes orb-glow-idle {
          0%, 100% { box-shadow: 0 0 18px 5px rgba(120, 140, 255, 0.18), 0 0 36px 10px rgba(120, 140, 255, 0.08); }
          50% { box-shadow: 0 0 24px 8px rgba(120, 140, 255, 0.25), 0 0 48px 16px rgba(120, 140, 255, 0.1); }
        }

        @keyframes orb-glow-think {
          0%, 100% { box-shadow: 0 0 22px 8px rgba(120, 140, 255, 0.3), 0 0 48px 16px rgba(120, 140, 255, 0.14); }
          50% { box-shadow: 0 0 32px 12px rgba(120, 140, 255, 0.4), 0 0 60px 24px rgba(120, 140, 255, 0.2); }
        }

        @keyframes orb-glow-celebrate {
          0% { box-shadow: 0 0 18px 5px rgba(120, 140, 255, 0.18), 0 0 36px 10px rgba(120, 140, 255, 0.08); }
          40% { box-shadow: 0 0 40px 16px rgba(120, 140, 255, 0.45), 0 0 80px 32px rgba(120, 140, 255, 0.22); }
          100% { box-shadow: 0 0 18px 5px rgba(120, 140, 255, 0.18), 0 0 36px 10px rgba(120, 140, 255, 0.08); }
        }

        @keyframes bubble-in {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .orb-idle {
          animation: orb-breathe 3s ease-in-out infinite, orb-glow-idle 3s ease-in-out infinite;
        }

        .orb-thinking {
          animation: orb-think 1.5s ease-in-out infinite, orb-glow-think 1.5s ease-in-out infinite;
        }

        .orb-celebrating {
          animation: orb-celebrate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     orb-glow-celebrate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .orb-bubble {
          animation: bubble-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-idle,
          .orb-thinking,
          .orb-celebrating,
          .orb-bubble {
            animation: none !important;
          }

          .orb-idle,
          .orb-thinking {
            box-shadow: 0 0 18px 5px rgba(120, 140, 255, 0.18), 0 0 36px 10px rgba(120, 140, 255, 0.08);
          }
        }
      `}</style>

      <div
        className={cn(
          'flex items-center gap-3 transition-all',
          className,
        )}
        style={{
          transitionDuration: '600ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Orb */}
        <div
          className={cn(
            'relative h-12 w-12 flex-shrink-0 rounded-full',
            state === 'idle' && 'orb-idle',
            state === 'thinking' && 'orb-thinking',
            state === 'celebrating' && isCelebrating && 'orb-celebrating',
            state === 'celebrating' && !isCelebrating && 'orb-idle',
          )}
          style={{
            background:
              'radial-gradient(circle at 35% 35%, #818cf8, #4f6df5, #3b5bdb)',
          }}
          aria-hidden="true"
        />

        {/* Speech bubble */}
        {message && (
          <div className="orb-bubble relative max-w-xs">
            {/* Triangle pointer */}
            <div
              className="absolute left-0 top-1/2 -translate-x-[6px] -translate-y-1/2"
              aria-hidden="true"
            >
              <div
                className="h-3 w-3 rotate-45 rounded-sm border-l border-b border-stone-200/60 bg-white"
              />
            </div>

            {/* Bubble content */}
            <div
              className="rounded-xl border border-stone-200/60 bg-white px-4 py-2.5 shadow-sm"
            >
              <p className="text-[14px] leading-relaxed text-stone-700">
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
