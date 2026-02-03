import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.\-]+/g, '_')
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const typeValue = formData.get('type')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } },
        { status: 400 }
      )
    }

    if (typeof typeValue !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (typeValue !== 'cv' && typeValue !== 'cover_letter_template') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'File must be PDF, DOCX, or TXT' },
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File must be less than 5MB' } },
        { status: 400 }
      )
    }

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(authUser.id, authUser.email)

    const safeName = sanitizeFilename(file.name)
    const fileName = `${user.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' } },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(fileName)

    // Basic parsing: TXT can be read when the runtime supports it; PDF/DOCX parsing is deferred.
    // In some test environments (jsdom), File lacks `text()`/`arrayBuffer()`, so we feature-detect.
    let parsedContent: string | null = '[File parsing not implemented]'
    if (file.type === 'text/plain') {
      if (typeof file.text === 'function') {
        parsedContent = await file.text()
      } else if (typeof file.arrayBuffer === 'function') {
        const buf = await file.arrayBuffer()
        parsedContent = new TextDecoder().decode(buf)
      }
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: typeValue,
        fileUrl: publicUrl,
        parsedContent,
      },
    })

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process upload' } },
      { status: 500 }
    )
  }
}
