import { PrismaClient, DocumentType } from '@prisma/client'

// Use DIRECT_URL to bypass connection pooler (PgBouncer) for seed operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

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

  // Create mock CV
  const cv = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.cv,
      fileUrl: 'https://example.com/mock-cv.pdf',
      parsedContent: MOCK_CV_CONTENT.trim(),
      skills: MOCK_SKILLS,
    },
  })
  console.log(`✅ CV created: ${cv.id}`)

  // Create mock Personal Letter
  const personalLetter = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.personal_letter,
      fileUrl: 'https://example.com/mock-personal-letter.pdf',
      parsedContent: MOCK_PERSONAL_LETTER_CONTENT.trim(),
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
