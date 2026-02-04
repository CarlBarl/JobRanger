import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('auth')

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('resetLinkInvalidTitle')}</CardTitle>
            <CardDescription>{t('resetLinkInvalidDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot" className="text-primary hover:underline">
              {t('requestNewResetLink')}
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <ResetPasswordForm />
    </main>
  )
}
