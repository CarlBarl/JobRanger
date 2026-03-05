import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { AuthShell } from '@/components/auth/AuthShell'
import { getTranslations } from 'next-intl/server'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('auth')

  if (!user) {
    return (
      <AuthShell
        title={t('resetLinkInvalidTitle')}
        description={t('resetLinkInvalidDescription')}
        footerHref="/auth/forgot"
        footerLabel={t('requestNewResetLink')}
      >
        <p className="hidden">
          <Link href="/auth/forgot">{t('requestNewResetLink')}</Link>
        </p>
      </AuthShell>
    )
  }

  return <ResetPasswordForm />
}
