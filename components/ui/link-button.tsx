'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'

interface LinkButtonProps extends ButtonProps {
  href: string
  children: ReactNode
}

export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <Button
      {...props}
      disabled={pending}
      onClick={() => {
        setPending(true)
        router.push(href)
      }}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
