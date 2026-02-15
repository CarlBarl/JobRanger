import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getDocumentWithAccessUrl } from '@/lib/data/dashboard-loaders'

interface DashboardDocumentsSectionProps {
  userId: string
}

export async function DashboardDocumentsSection({ userId }: DashboardDocumentsSectionProps) {
  const [cvDocument, personalLetter] = await Promise.all([
    getDocumentWithAccessUrl(userId, 'cv'),
    getDocumentWithAccessUrl(userId, 'personal_letter'),
  ])

  return (
    <DashboardClient
      cvDocument={cvDocument}
      personalLetter={personalLetter}
      cvUploadComponent={<FileUpload />}
      personalLetterUploadComponent={<PersonalLetterUpload />}
    />
  )
}
