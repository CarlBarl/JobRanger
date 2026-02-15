import { normalizeSkillKey } from './skills/normalize'

interface JobTextFields {
  headline?: string | null
  description?: string | null
  occupation?: string | null
}

interface RelevanceScore {
  matched: number
  total: number
  score: number
  matchedSkills: string[]
}

export const DEFAULT_JOB_SKILL_CATALOG = [
  // --- Programming Languages ---
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
  'R', 'MATLAB', 'Perl',

  // --- Web & Frontend ---
  'React', 'Next.js', 'Angular', 'Vue', 'Svelte',
  'HTML', 'CSS', 'Tailwind', 'SASS', 'Bootstrap',

  // --- Backend & Runtime ---
  'Node.js', '.NET', 'Spring', 'Django', 'Flask', 'Express',
  'FastAPI', 'Ruby on Rails',

  // --- Databases ---
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Elasticsearch', 'Oracle', 'SQLite', 'DynamoDB', 'Cassandra',

  // --- Cloud & DevOps ---
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Terraform', 'Ansible', 'Jenkins', 'CI/CD',
  'Linux', 'Bash', 'Git', 'GitHub', 'GitLab',

  // --- Data & AI ---
  'Machine Learning', 'AI', 'Deep Learning', 'NLP',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'Power BI', 'Tableau', 'Data Analysis',
  'ETL', 'Data Warehouse', 'Spark', 'Hadoop',
  'Business Intelligence',

  // --- APIs & Architecture ---
  'REST', 'GraphQL', 'Microservices', 'API',
  'RabbitMQ', 'Kafka', 'gRPC',

  // --- Mobile ---
  'React Native', 'Flutter', 'iOS', 'Android',

  // --- Testing ---
  'Unit Testing', 'Integration Testing', 'Selenium',
  'Cypress', 'Jest', 'Playwright',

  // --- Design & UX ---
  'Figma', 'Sketch', 'Adobe XD', 'UX', 'UI',
  'Photoshop', 'Illustrator', 'InDesign',

  // --- Project & Methodology ---
  'Agile', 'Scrum', 'Kanban', 'PRINCE2', 'PMP',
  'ITIL', 'DevOps', 'Lean', 'Six Sigma',
  'Projektledning', 'Projektstyrning',

  // --- Soft Skills (Swedish) ---
  'Ledarskap', 'Kommunikation',
  'Problemlosning', 'Samarbete', 'Initiativformaga',
  'Flexibilitet', 'Ansvarstagande', 'Organisationsformaga',
  'Analytisk formaga', 'Kreativitet', 'Forhandling',

  // --- Soft Skills (English) ---
  'Leadership', 'Communication', 'Problem Solving',
  'Teamwork', 'Collaboration', 'Critical Thinking',
  'Time Management', 'Negotiation', 'Presentation',

  // --- Business & Finance ---
  'Excel', 'SAP', 'ERP', 'CRM', 'Salesforce',
  'Bokforing', 'Redovisning', 'Ekonomi', 'Budget',
  'Fakturering', 'Lonehantering', 'Controller',
  'Revision', 'Accounting', 'Finance', 'Controlling',

  // --- Office & Admin ---
  'Microsoft Office', 'Word', 'PowerPoint', 'Outlook',
  'Google Workspace', 'SharePoint', 'Teams',
  'Administration', 'Upphandling',

  // --- Sales & Marketing ---
  'Forsaljning', 'Marknadsforing', 'SEO', 'SEM',
  'Google Ads', 'Social Media', 'Content Marketing',
  'Kundservice', 'B2B', 'B2C', 'E-handel',
  'Nykundsbearbetning',

  // --- Healthcare (Swedish) ---
  'Omvardnad', 'Sjukvard', 'Medicin', 'Journalforing',
  'Patientsakerhet', 'Rehabilitering', 'Vardplanering',
  'Ambulanssjukvard', 'Intensivvard', 'Psykiatri',
  'Farmakologi', 'Hygienrutiner',

  // --- Education (Swedish) ---
  'Pedagogik', 'Undervisning', 'Didaktik',
  'Specialpedagogik', 'Forskola', 'Grundskola',
  'Gymnasium', 'Laroplaner', 'Bedomning',

  // --- Trades & Industry (Swedish) ---
  'Svetsning', 'CNC', 'CAD', 'CAM', 'SolidWorks',
  'AutoCAD', 'Elinstallation', 'VVS',
  'Mekanik', 'Hydraulik', 'Pneumatik',
  'Ritningslasning', 'Kvalitetskontroll',
  'ISO 9001', 'Maskinoperator', 'PLC',

  // --- Logistics & Transport ---
  'Logistik', 'Lagerhantering', 'Inkok',
  'Supply Chain', 'Fordonskorkort',
  'B-korkort', 'C-korkort', 'CE-korkort',
  'Truckkort', 'ADR', 'Spedition',

  // --- Legal & Public Sector ---
  'Juridik', 'Avtalsratt', 'Arbetsratt',
  'GDPR', 'Compliance', 'Offentlig upphandling',
  'Forvaltningsratt', 'Myndighetsutovning',

  // --- Construction ---
  'Byggledning', 'Projektering', 'BIM',
  'Betong', 'Trakonstruktion', 'Installationssamordning',
  'Bygglov', 'Arbetsmiljo',

  // --- Security & Networking ---
  'Cybersecurity', 'Network', 'Firewall',
  'Penetration Testing', 'SIEM', 'SOC',
  'ISO 27001', 'CCNA', 'TCP/IP',

  // --- Languages ---
  'Svenska', 'Engelska', 'Tyska', 'Franska', 'Spanska',
  'Arabiska', 'Mandarin',
] as const

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSkillVariants(skill: string): string[] {
  const normalized = normalizeSkillKey(skill)
  if (!normalized) return []

  const variants = new Set<string>([normalized])

  if (normalized.includes(' ')) {
    variants.add(normalized.replace(/ /g, ''))
  }

  if (normalized === 'node' || normalized === 'nodejs' || normalized === 'node js') {
    variants.add('node js')
    variants.add('nodejs')
  }

  if (normalized === 'c#' || normalized === 'c sharp' || normalized === 'csharp') {
    variants.add('c#')
    variants.add('c sharp')
    variants.add('csharp')
  }

  if (normalized === 'c++' || normalized === 'cpp') {
    variants.add('c++')
    variants.add('cpp')
  }

  if (normalized === 'react') {
    variants.add('react js')
    variants.add('reactjs')
  }

  if (normalized === 'vue') {
    variants.add('vue js')
    variants.add('vuejs')
  }

  if (normalized === 'typescript') {
    variants.add('type script')
  }

  if (normalized === 'javascript') {
    variants.add('java script')
  }

  if (normalized === 'net') {
    variants.add('dotnet')
  }

  return Array.from(variants)
}

function hasSkillMatch(text: string, skill: string): boolean {
  const variants = buildSkillVariants(skill)
  for (const variant of variants) {
    const pattern = variant
      .split(' ')
      .filter(Boolean)
      .map((token) => escapeRegex(token))
      .join('\\s+')

    if (!pattern) continue

    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}($|[^\\p{L}\\p{N}])`, 'u')
    if (regex.test(text)) {
      return true
    }
  }

  return false
}

function buildJobText(job: JobTextFields): string {
  return normalizeSkillKey([job.headline, job.description, job.occupation].filter(Boolean).join(' '))
}

function dedupeSkills(skills: readonly string[]): string[] {
  const byKey = new Map<string, string>()
  for (const skill of skills) {
    const key = normalizeSkillKey(skill)
    if (!key || byKey.has(key)) continue
    byKey.set(key, skill)
  }
  return Array.from(byKey.values())
}

export function extractJobSkills(
  job: JobTextFields,
  catalog?: readonly string[]
): string[] {
  const text = buildJobText(job)
  if (!text) return []

  const candidates = dedupeSkills(catalog ?? DEFAULT_JOB_SKILL_CATALOG)

  return candidates.filter((skill) => hasSkillMatch(text, skill))
}

export function scoreJobRelevance(
  job: JobTextFields,
  skills: string[]
): RelevanceScore {
  if (skills.length === 0) {
    return { matched: 0, total: 0, score: 0, matchedSkills: [] }
  }

  const text = buildJobText(job)

  const matchedSkills = skills.filter((skill) => hasSkillMatch(text, skill))
  const matched = matchedSkills.length

  return {
    matched,
    total: skills.length,
    score: matched / skills.length,
    matchedSkills,
  }
}
