'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  const toggleLocale = async () => {
    const newLocale = locale === 'sv' ? 'en' : 'sv'

    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })

    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale}>
      <Globe className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">{locale === 'sv' ? 'EN' : 'SV'}</span>
    </Button>
  )
}
