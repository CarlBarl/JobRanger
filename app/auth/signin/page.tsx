import { SignInForm } from '@/components/auth/SignInForm'

interface SignInPageProps {
  searchParams?: Promise<{ next?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = (await searchParams) ?? {}

  return <SignInForm nextPath={next} />
}
