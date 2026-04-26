import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
// Initialise i18n once for the whole suite so useTranslation returns real strings
// instead of the raw keys.
import '../i18n'

// Make sure each test starts with a clean DOM and clean storage.
afterEach(() => {
  cleanup()
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.clear()
  }
})

// jsdom does not implement matchMedia or ResizeObserver — recharts/Tailwind
// occasionally probe these. Provide minimal stubs.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  }
}

// Default: stub fetch so CountryProvider's WB API call does not hit the network.
// Individual tests can override with vi.spyOn(globalThis, 'fetch').
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('fetch not stubbed')))
} else {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.reject(new Error('fetch not stubbed'))
  )
}
