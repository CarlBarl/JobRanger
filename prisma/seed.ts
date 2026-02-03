import dotenv from 'dotenv'
// Load .env.local first (higher priority), then .env as fallback
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
import { PrismaClient, DocumentType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Use DIRECT_URL to bypass connection pooler (PgBouncer) for seed operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

// Supabase client is created inside main() to ensure env vars are loaded
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}

const BUCKET_NAME = 'documents'

// Ensure the documents bucket exists, create if not
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucketExists(supabase: any): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`)
  }

  const bucketExists = buckets?.some((b: { name: string }) => b.name === BUCKET_NAME)

  if (!bucketExists) {
    console.log(`📦 Creating "${BUCKET_NAME}" bucket...`)
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
    })

    if (createError) {
      throw new Error(`Failed to create bucket: ${createError.message}`)
    }
    console.log(`✅ Bucket "${BUCKET_NAME}" created`)
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" already exists`)
  }
}

const DEBUG_USER_EMAIL = 'carlelelid@gmail.com'
const DEBUG_USER_ID = 'debug-user-001'

const MOCK_CV_CONTENT = `
CARL ELELID
Mjukvaruutvecklare | Stockholm, Sverige
carl.elelid@gmail.com | +46 70 123 4567

PROFIL
Erfaren mjukvaruutvecklare med 5+ års erfarenhet av fullstack-utveckling.
Specialiserad på React, Node.js och molnteknologier. Passionerad för att
bygga användarvänliga applikationer och lösa komplexa tekniska problem.

ARBETSLIVSERFARENHET

Senior Utvecklare | Tech Solutions AB | 2021 - Nu
- Ledde utvecklingen av företagets huvudprodukt med React och TypeScript
- Implementerade CI/CD-pipelines som minskade deploymenttiden med 60%
- Mentorerade juniorutvecklare och ledde kodgranskningar

Fullstack Utvecklare | Digital Innovation AB | 2019 - 2021
- Utvecklade REST APIs med Node.js och Express
- Byggde responsiva webbapplikationer med React
- Arbetade i agila team med Scrum-metodologi

UTBILDNING

Civilingenjör Datateknik | KTH | 2015 - 2019
- Inriktning mot mjukvaruutveckling
- Examensarbete om maskininlärning för bildklassificering

TEKNISKA KOMPETENSER

Programmeringsspråk: JavaScript, TypeScript, Python, Java
Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind
Backend: Node.js, Express, PostgreSQL, MongoDB
Verktyg: Git, Docker, AWS, Azure, CI/CD
Metodik: Agile, Scrum, TDD

SPRÅK
Svenska: Modersmål
Engelska: Flytande
`

const MOCK_PERSONAL_LETTER_CONTENT = `
Hej,

Jag heter Carl Elelid och är en passionerad mjukvaruutvecklare med över fem års
erfarenhet av att bygga moderna webbapplikationer. Jag skriver till er för att
uttrycka mitt starka intresse för möjligheter inom ert företag.

Under min karriär har jag utvecklat en djup expertis inom fullstack-utveckling,
med särskilt fokus på React och Node.js. Jag trivs i miljöer där jag kan kombinera
teknisk problemlösning med kreativt tänkande för att skapa lösningar som verkligen
gör skillnad för användarna.

Det som driver mig mest i mitt arbete är möjligheten att lära mig nya teknologier
och arbeta med begåvade kollegor. Jag tror starkt på att dela kunskap och har
alltid uppskattat att mentorera yngre utvecklare i teamet.

På min nuvarande tjänst har jag haft förmånen att leda utvecklingen av kritiska
system och implementera processer som förbättrat både kodkvalitet och teamets
produktivitet. Jag är särskilt stolt över att ha infört automatiserade
testningsrutiner som dramatiskt minskat antalet buggar i produktion.

Utöver mina tekniska färdigheter värderar jag kommunikation och samarbete högt.
Jag har erfarenhet av att arbeta nära produktägare och designers för att
säkerställa att vi levererar produkter som möter både affärsmål och användarbehov.

Jag är övertygad om att min kombination av teknisk kompetens, ledarskapsförmåga
och genuina intresse för att skapa värde skulle vara en tillgång för ert team.

Jag ser fram emot möjligheten att diskutera hur jag kan bidra till er organisation.

Med vänliga hälsningar,
Carl Elelid
`

const MOCK_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'PostgreSQL',
  'Docker',
  'AWS',
  'Git',
  'Agile/Scrum',
  'TDD',
  'CI/CD',
]

async function main() {
  console.log('🌱 Starting seed...')

  // Initialize Supabase client
  const supabase = getSupabaseClient()

  // Ensure the documents bucket exists
  await ensureBucketExists(supabase)

  // Create or update debug user
  const user = await prisma.user.upsert({
    where: { email: DEBUG_USER_EMAIL },
    update: {},
    create: {
      id: DEBUG_USER_ID,
      email: DEBUG_USER_EMAIL,
      name: 'Carl Elelid',
    },
  })
  console.log(`✅ User created/updated: ${user.email}`)

  // Delete existing documents for clean seed
  await prisma.document.deleteMany({
    where: { userId: user.id },
  })

  // Upload CV to Supabase Storage
  const cvFileName = `${user.id}/${Date.now()}-cv.txt`
  const cvContent = MOCK_CV_CONTENT.trim()
  const { error: cvUploadError } = await supabase.storage
    .from('documents')
    .upload(cvFileName, Buffer.from(cvContent), {
      contentType: 'text/plain',
      upsert: true,
    })

  if (cvUploadError) {
    throw new Error(`Failed to upload CV: ${cvUploadError.message}`)
  }

  const {
    data: { publicUrl: cvUrl },
  } = supabase.storage.from('documents').getPublicUrl(cvFileName)
  console.log(`✅ CV uploaded to: ${cvUrl}`)

  // Create CV document with fileUrl
  const cv = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.cv,
      fileUrl: cvUrl,
      parsedContent: cvContent,
      skills: MOCK_SKILLS,
    },
  })
  console.log(`✅ CV created: ${cv.id}`)

  // Upload Personal Letter to Supabase Storage
  const letterFileName = `${user.id}/${Date.now()}-personal_letter.txt`
  const letterContent = MOCK_PERSONAL_LETTER_CONTENT.trim()
  const { error: letterUploadError } = await supabase.storage
    .from('documents')
    .upload(letterFileName, Buffer.from(letterContent), {
      contentType: 'text/plain',
      upsert: true,
    })

  if (letterUploadError) {
    throw new Error(`Failed to upload Personal Letter: ${letterUploadError.message}`)
  }

  const {
    data: { publicUrl: letterUrl },
  } = supabase.storage.from('documents').getPublicUrl(letterFileName)
  console.log(`✅ Personal Letter uploaded to: ${letterUrl}`)

  // Create Personal Letter document with fileUrl
  const personalLetter = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.personal_letter,
      fileUrl: letterUrl,
      parsedContent: letterContent,
    },
  })
  console.log(`✅ Personal Letter created: ${personalLetter.id}`)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
