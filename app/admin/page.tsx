import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUserAdmin } from '@/lib/security/authorization'
import { AdminUsersPanel } from './AdminUsersPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/auth/signin')
  }

  const hasAdminRole = await isUserAdmin(authUser.id)
  if (!hasAdminRole) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium tracking-[-0.01em] text-foreground">
            User Management
          </h1>
          <a
            href="/dashboard"
            className="text-[13px] text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            Back to Dashboard
          </a>
        </div>
        <AdminUsersPanel />
      </main>
    </div>
  )
}
