'use server'

import { createClient } from '@/lib/supabase/server'

export async function updatePassword(password: string) {
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
