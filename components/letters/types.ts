export type LetterListItem = {
  id: string
  afJobId: string
  jobTitle: string | null
  content: string
  createdAt: string
  savedJob?: {
    headline: string | null
    employer: string | null
    location: string | null
    deadline: string | null
    webpageUrl: string | null
  } | null
}
