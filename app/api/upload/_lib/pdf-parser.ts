import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

function ensurePdfRuntimePolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    // @ts-expect-error Minimal stub for text-only PDF extraction
    globalThis.DOMMatrix = class DOMMatrix {}
  }
  if (typeof globalThis.ImageData === 'undefined') {
    // @ts-expect-error Minimal stub for text-only PDF extraction
    globalThis.ImageData = class ImageData {}
  }
  if (typeof globalThis.Path2D === 'undefined') {
    // @ts-expect-error Minimal stub for text-only PDF extraction
    globalThis.Path2D = class Path2D {}
  }
}

ensurePdfRuntimePolyfills()

type PdfParser = {
  getText: () => Promise<{ text: string }>
  destroy: () => Promise<void>
}

type PdfParseConstructor = {
  new (params: { data: Uint8Array }): PdfParser
  setWorker: (workerSrc?: string) => string
}

export type PdfWorkerBootstrapStatus =
  | 'skipped_test'
  | 'already_initialized'
  | 'initialized_from_module'
  | 'module_missing_handler'
  | 'module_import_failed'

export type PdfWorkerBootstrapResult = {
  status: PdfWorkerBootstrapStatus
  message?: string
}

const require = createRequire(import.meta.url)
let isPdfWorkerConfigured = false
let resolvedPdfWorkerSrc: string | null | undefined

function resolvePdfWorkerSource() {
  if (resolvedPdfWorkerSrc !== undefined) {
    return resolvedPdfWorkerSrc
  }

  try {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
    const workerSource = readFileSync(workerPath, 'utf8')
    resolvedPdfWorkerSrc = `data:text/javascript;base64,${Buffer.from(workerSource, 'utf8').toString('base64')}`
  } catch {
    resolvedPdfWorkerSrc = null
  }

  return resolvedPdfWorkerSrc
}

export async function ensurePdfJsWorkerHandler(): Promise<PdfWorkerBootstrapResult> {
  if (process.env.NODE_ENV === 'test') {
    return { status: 'skipped_test' }
  }

  const globalWithPdfWorker = globalThis as typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler?: unknown }
  }

  if (globalWithPdfWorker.pdfjsWorker?.WorkerMessageHandler) {
    return { status: 'already_initialized' }
  }

  try {
    const workerModule = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs')) as {
      WorkerMessageHandler?: unknown
    }

    if (!workerModule.WorkerMessageHandler) {
      return { status: 'module_missing_handler' }
    }

    globalWithPdfWorker.pdfjsWorker = {
      ...(globalWithPdfWorker.pdfjsWorker ?? {}),
      WorkerMessageHandler: workerModule.WorkerMessageHandler,
    }

    return { status: 'initialized_from_module' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: 'module_import_failed', message }
  }
}

async function getPdfParseConstructor(): Promise<PdfParseConstructor> {
  const { PDFParse } = await import('pdf-parse')
  const ctor = PDFParse as unknown as PdfParseConstructor

  if (!isPdfWorkerConfigured) {
    const workerSrc = resolvePdfWorkerSource()
    if (workerSrc) {
      ctor.setWorker(workerSrc)
    }
    isPdfWorkerConfigured = true
  }

  return ctor
}

type ExtractPdfTextOptions = {
  onWorkerBootstrap?: (result: PdfWorkerBootstrapResult) => void
  onWorkerSource?: (workerSrc: string) => void
  onParseError?: (error: unknown) => void
  onCleanupError?: (error: unknown) => void
}

export async function extractPdfText(
  bytes: Uint8Array,
  options: ExtractPdfTextOptions = {}
): Promise<string | null> {
  let parser: PdfParser | null = null

  try {
    const bootstrapResult = await ensurePdfJsWorkerHandler()
    options.onWorkerBootstrap?.(bootstrapResult)

    const PdfParse = await getPdfParseConstructor()
    options.onWorkerSource?.(PdfParse.setWorker())

    parser = new PdfParse({ data: new Uint8Array(Buffer.from(bytes)) })
    const result = await parser.getText()
    return result.text
  } catch (error) {
    options.onParseError?.(error)
    return null
  } finally {
    if (parser) {
      try {
        await parser.destroy()
      } catch (error) {
        options.onCleanupError?.(error)
      }
    }
  }
}
