import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export async function DashboardHeader() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-xl font-semibold">
          JobMatch
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/jobs">
            <Button variant="ghost">Jobs</Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost">Letters</Button>
          </Link>
          {user?.email ? (
            <span className="ml-2 text-sm text-muted-foreground">{user.email}</span>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

