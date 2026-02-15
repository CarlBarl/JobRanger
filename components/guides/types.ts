export interface GuidedTourStep {
  id: string
  targetId: string
  title: string
  description: string
}

export interface GuidedTourLabels {
  step: string
  previous: string
  next: string
  finish: string
  skip: string
}
