'use client'

import { Button } from '@/components/ui/button'

type QuickSignInButtonProps = {
  disabled: boolean
  onClick: () => void
}

export function QuickSignInButton({ disabled, onClick }: QuickSignInButtonProps) {
  return (
    <div className="mt-4 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClick}
        disabled={disabled}
      >
        🚀 Quick Sign In (Dev)
      </Button>
    </div>
  )
}
