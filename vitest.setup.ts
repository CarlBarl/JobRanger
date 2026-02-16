import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Radix Select relies on Pointer Capture APIs which are not implemented by jsdom.
if (!('hasPointerCapture' in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).hasPointerCapture = () => false
}
if (!('setPointerCapture' in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).setPointerCapture = () => {}
}
if (!('releasePointerCapture' in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).releasePointerCapture = () => {}
}
if (!('scrollIntoView' in HTMLElement.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLElement.prototype as any).scrollIntoView = () => {}
}

afterEach(() => {
  cleanup()
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  }),
  headers: () => new Headers(),
}))
