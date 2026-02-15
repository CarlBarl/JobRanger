import { SkillsEditor } from '@/components/dashboard/SkillsEditor'
import { getCvDocument } from '@/lib/data/dashboard-loaders'

interface DashboardSkillsSectionProps {
  userId: string
}

export async function DashboardSkillsSection({ userId }: DashboardSkillsSectionProps) {
  const cvDocument = await getCvDocument(userId)

  if (!cvDocument) return null

  const skills = (cvDocument.skills as string[] | null) ?? []

  return (
    <SkillsEditor
      skills={skills}
      documentId={cvDocument.id}
    />
  )
}
