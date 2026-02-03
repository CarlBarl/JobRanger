import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-16 space-y-12">
        <header className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            JobMatch
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your CV, find relevant Swedish jobs, and generate tailored
            cover letters.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signin">
              <Button>Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Go to dashboard</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-6 space-y-2">
            <h2 className="font-semibold">CV skills</h2>
            <p className="text-sm text-muted-foreground">
              Extract skills from your CV and use them as matching context.
            </p>
          </div>
          <div className="rounded-xl border p-6 space-y-2">
            <h2 className="font-semibold">Job search</h2>
            <p className="text-sm text-muted-foreground">
              Search Arbetsformedlingen listings without exposing your API key
              to the browser.
            </p>
          </div>
          <div className="rounded-xl border p-6 space-y-2">
            <h2 className="font-semibold">Cover letters</h2>
            <p className="text-sm text-muted-foreground">
              Generate a tailored letter for each job and keep everything in one
              place.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

