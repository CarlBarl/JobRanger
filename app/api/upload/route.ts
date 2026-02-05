import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_MIME_SET } from '@/lib/constants'

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.\-]+/g, '_')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
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

    if (typeValue !== 'cv' && typeValue !== 'personal_letter') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (!ALLOWED_UPLOAD_MIME_SET.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'File must be PDF, DOCX, or TXT' },
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
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
      if (typeof file.arrayBuffer === 'function') {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)

        // Try UTF-8 first, then fall back to Windows-1252 for Swedish text files
        let text = new TextDecoder('utf-8').decode(bytes)

        // Check for Mojibake patterns (UTF-8 bytes misread as Latin-1)
        // These patterns indicate the file was likely Windows-1252/Latin-1 encoded
        const hasMojibake = /Ã¤|Ã¶|Ã¥|Ã„|Ã–|Ã…/.test(text)

        if (hasMojibake) {
          // Re-decode as Windows-1252 (superset of Latin-1, common on Windows)
          text = new TextDecoder('windows-1252').decode(bytes)
        }

        parsedContent = text
      } else if (typeof file.text === 'function') {
        parsedContent = await file.text()
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
