import type { GuidedTourStep } from '@/components/guides/types'

export type SegmentGuideMap = Record<
  'dashboard' | 'jobs' | 'job-detail' | 'letters' | 'settings',
  GuidedTourStep[]
>

type GuideTranslations = (
  key: string,
  values?: Record<string, string | number | Date>
) => string

export function isJobDetailPath(pathname: string): boolean {
  return pathname.startsWith('/jobs/') && pathname !== '/jobs'
}

export function createSegmentGuides(t: GuideTranslations): SegmentGuideMap {
  return {
    dashboard: [
      {
        id: 'dashboard-nav',
        targetId: 'top-nav',
        title: t('tour.dashboard.steps.nav.title'),
        description: t('tour.dashboard.steps.nav.description'),
      },
      {
        id: 'dashboard-nav-jobs',
        targetId: 'top-nav-jobs',
        title: t('tour.dashboard.steps.navJobs.title'),
        description: t('tour.dashboard.steps.navJobs.description'),
      },
      {
        id: 'dashboard-quick-links',
        targetId: 'dashboard-quick-actions',
        title: t('tour.dashboard.steps.quickLinks.title'),
        description: t('tour.dashboard.steps.quickLinks.description'),
      },
      {
        id: 'dashboard-quick-cv-studio',
        targetId: 'dashboard-quick-link-cv-studio',
        title: t('tour.dashboard.steps.quickCvStudio.title'),
        description: t('tour.dashboard.steps.quickCvStudio.description'),
      },
      {
        id: 'dashboard-quick-letters',
        targetId: 'dashboard-quick-link-letters',
        title: t('tour.dashboard.steps.quickLetters.title'),
        description: t('tour.dashboard.steps.quickLetters.description'),
      },
      {
        id: 'dashboard-quick-settings',
        targetId: 'dashboard-quick-link-settings',
        title: t('tour.dashboard.steps.quickSettings.title'),
        description: t('tour.dashboard.steps.quickSettings.description'),
      },
      {
        id: 'dashboard-documents',
        targetId: 'dashboard-documents',
        title: t('tour.dashboard.steps.documents.title'),
        description: t('tour.dashboard.steps.documents.description'),
      },
      {
        id: 'dashboard-upload-new',
        targetId: 'dashboard-cv-upload-new',
        title: t('tour.dashboard.steps.uploadNew.title'),
        description: t('tour.dashboard.steps.uploadNew.description'),
      },
      {
        id: 'dashboard-edit-doc',
        targetId: 'dashboard-document-actions',
        title: t('tour.dashboard.steps.editDocument.title'),
        description: t('tour.dashboard.steps.editDocument.description'),
      },
      {
        id: 'dashboard-skills',
        targetId: 'dashboard-skills',
        title: t('tour.dashboard.steps.skills.title'),
        description: t('tour.dashboard.steps.skills.description'),
      },
      {
        id: 'dashboard-skills-add',
        targetId: 'dashboard-skills-add',
        title: t('tour.dashboard.steps.skillsAdd.title'),
        description: t('tour.dashboard.steps.skillsAdd.description'),
      },
      {
        id: 'dashboard-skills-remove',
        targetId: 'dashboard-skills-remove',
        title: t('tour.dashboard.steps.skillsRemove.title'),
        description: t('tour.dashboard.steps.skillsRemove.description'),
      },
      {
        id: 'dashboard-saved-jobs',
        targetId: 'dashboard-recent-jobs',
        title: t('tour.dashboard.steps.savedJobs.title'),
        description: t('tour.dashboard.steps.savedJobs.description'),
      },
      {
        id: 'dashboard-go-to-jobs',
        targetId: 'top-nav-jobs',
        title: t('tour.dashboard.steps.goToJobs.title'),
        description: t('tour.dashboard.steps.goToJobs.description'),
      },
    ],
    jobs: [
      {
        id: 'jobs-nav',
        targetId: 'top-nav-jobs',
        title: t('tour.jobs.steps.navJobs.title'),
        description: t('tour.jobs.steps.navJobs.description'),
      },
      {
        id: 'jobs-search',
        targetId: 'jobs-search-bar',
        title: t('tour.jobs.steps.searchBar.title'),
        description: t('tour.jobs.steps.searchBar.description'),
      },
      {
        id: 'jobs-keyword-tips',
        targetId: 'jobs-search-keywords',
        title: t('tour.jobs.steps.keywordTips.title'),
        description: t('tour.jobs.steps.keywordTips.description'),
      },
      {
        id: 'jobs-skills-mode',
        targetId: 'jobs-skills-toggle',
        title: t('tour.jobs.steps.skillsMode.title'),
        description: t('tour.jobs.steps.skillsMode.description'),
      },
      {
        id: 'jobs-keyword-ranking',
        targetId: 'jobs-search-submit',
        title: t('tour.jobs.steps.keywordRanking.title'),
        description: t('tour.jobs.steps.keywordRanking.description'),
      },
      {
        id: 'jobs-saved-tab',
        targetId: 'jobs-tab-saved',
        title: t('tour.jobs.steps.savedTab.title'),
        description: t('tour.jobs.steps.savedTab.description'),
      },
      {
        id: 'jobs-saved-list',
        targetId: 'jobs-saved-content',
        title: t('tour.jobs.steps.savedList.title'),
        description: t('tour.jobs.steps.savedList.description'),
      },
      {
        id: 'jobs-open-listing',
        targetId: 'jobs-first-result-anchor',
        title: t('tour.jobs.steps.openListing.title'),
        description: t('tour.jobs.steps.openListing.description'),
      },
    ],
    'job-detail': [
      {
        id: 'detail-actions',
        targetId: 'jobs-detail-actions',
        title: t('tour.detail.steps.actions.title'),
        description: t('tour.detail.steps.actions.description'),
      },
      {
        id: 'detail-guidance',
        targetId: 'jobs-detail-guidance-input',
        title: t('tour.detail.steps.guidance.title'),
        description: t('tour.detail.steps.guidance.description'),
        allowTargetInteraction: true,
      },
      {
        id: 'detail-generate',
        targetId: 'jobs-detail-generate-button',
        title: t('tour.detail.steps.generate.title'),
        description: t('tour.detail.steps.generate.description'),
        allowTargetInteraction: true,
        nextRequiresTargetId: 'jobs-detail-generated-now',
      },
    ],
    letters: [
      {
        id: 'letters-overview',
        targetId: 'letters-main',
        title: t('tour.letters.steps.overview.title'),
        description: t('tour.letters.steps.overview.description'),
      },
      {
        id: 'letters-copy',
        targetId: 'letters-first-copy',
        title: t('tour.letters.steps.copy.title'),
        description: t('tour.letters.steps.copy.description'),
      },
    ],
    settings: [
      {
        id: 'settings-language',
        targetId: 'settings-language-switcher',
        title: t('tour.settings.steps.language.title'),
        description: t('tour.settings.steps.language.description'),
      },
      {
        id: 'settings-guidance',
        targetId: 'dashboard-letter-guidance',
        title: t('tour.settings.steps.guidance.title'),
        description: t('tour.settings.steps.guidance.description'),
      },
    ],
  }
}
