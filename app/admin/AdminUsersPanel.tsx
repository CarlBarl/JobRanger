'use client'

import { useCallback, useEffect, useState } from 'react'

interface AdminUser {
  id: string
  email: string
  name: string | null
  onboardingCompleted: boolean
  createdAt: string
  _count: {
    documents: number
    savedJobs: number
    generatedLetters: number
  }
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || 'Failed to fetch users')
        return
      }
      setUsers(data.data)
    } catch {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Delete user "${user.name || user.email}"?\n\nThis will permanently remove their account, documents, saved jobs, and generated letters.`
    )
    if (!confirmed) return

    setDeletingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        alert(data.error?.message || 'Failed to delete user')
        return
      }
      await fetchUsers()
    } catch {
      alert('Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-[13px] text-muted-foreground/60">
        Loading users...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-red-500">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchUsers() }}
          className="mt-2 text-[13px] text-muted-foreground/60 underline transition-colors hover:text-foreground"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border/40">
            <th className="pb-2 pr-4 font-medium text-muted-foreground/60">Email</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground/60">Name</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground/60">Onboarded</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground/60">Docs</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground/60">Jobs</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground/60">Letters</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground/60">Created</th>
            <th className="pb-2 font-medium text-muted-foreground/60"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/20">
              <td className="py-2.5 pr-4 text-foreground">{user.email}</td>
              <td className="py-2.5 pr-4 text-foreground">{user.name || '\u2014'}</td>
              <td className="py-2.5 pr-4">
                <span className={user.onboardingCompleted ? 'text-green-600' : 'text-muted-foreground/40'}>
                  {user.onboardingCompleted ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">{user._count.documents}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">{user._count.savedJobs}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">{user._count.generatedLetters}</td>
              <td className="py-2.5 pr-4 text-muted-foreground/60">
                {new Date(user.createdAt).toLocaleDateString('sv-SE')}
              </td>
              <td className="py-2.5">
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  className="text-[12px] text-red-500/70 transition-colors hover:text-red-500 disabled:opacity-40"
                >
                  {deletingId === user.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="py-8 text-center text-[13px] text-muted-foreground/60">No users found.</p>
      )}
      <p className="mt-4 text-[12px] text-muted-foreground/40">
        {users.length} user{users.length !== 1 ? 's' : ''} total
      </p>
    </div>
  )
}
