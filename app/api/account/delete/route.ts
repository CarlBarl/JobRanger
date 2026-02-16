import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDocumentStoragePath } from '@/lib/storage'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

export async function DELETE(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const deleteLimit = consumeRateLimit('account-delete-user', user.id, 3, 60 * 60 * 1000)
  if (!deleteLimit.allowed) {
    return rateLimitResponse(
      'Account deletion rate limit exceeded. Please try again later.',
      deleteLimit.retryAfterSeconds
    )
  }

  try {
    const serviceClient = createServiceClient()

    // 1. Delete Supabase Auth user via service role.
    // Fail closed here to prevent "successful" deletion while auth identity still exists.
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError.message)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' },
        },
        { status: 500 }
      )
    }

    // 2. Delete user's files from Supabase Storage
    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      select: { fileUrl: true },
    })

    const storagePaths = documents
      .map((doc: { fileUrl: string | null }) => getDocumentStoragePath(doc.fileUrl))
      .filter((path: string | null): path is string => path !== null)

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(storagePaths)
      if (storageError) {
        console.error('Storage cleanup error during account deletion:', storageError.message)
        // Continue with deletion - storage files are secondary
      }
    }

    // 3. Delete User row (cascades to Document, SavedJob, GeneratedLetter)
    await prisma.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' } },
      { status: 500 }
    )
  }
}
