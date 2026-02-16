import { SignInForm } from '@/components/auth/SignInForm'
import { getTranslations } from 'next-intl/server'

interface SignInPageProps {
  searchParams?: Promise<{ next?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const common = await getTranslations('common')
  const { next } = (await searchParams) ?? {}

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="relative z-10 w-full max-w-md">
        <div className="animate-fade-up mb-8 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            {common('appName')}
          </span>
        </div>
        <div className="animate-fade-up delay-1">
          <SignInForm nextPath={next} />
        </div>
      </div>
    </main>
  )
}
