import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver or IntersectionObserver.
// Headless UI and other libraries rely on these, so we provide minimal stubs.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver
