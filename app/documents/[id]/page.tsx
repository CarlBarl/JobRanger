import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DocumentEditor } from '@/components/documents/DocumentEditor'

interface DocumentPageProps {
  params: { id: string }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  })

  if (!document) {
    redirect('/dashboard')
  }

  const serializedDocument = {
    id: document.id,
    type: document.type as 'cv' | 'personal_letter',
    parsedContent: document.parsedContent,
    fileUrl: document.fileUrl,
    createdAt: document.createdAt.toISOString().slice(0, 10),
  }

  return <DocumentEditor document={serializedDocument} />
}
