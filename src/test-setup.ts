// Node 26 defines a globalThis.localStorage getter that returns undefined
// unless --localstorage-file is provided. Since globalThis === window in jsdom,
// this shadows jsdom's own localStorage. We delete the Node getter so jsdom's
// Storage implementation (available on the window prototype chain) takes effect.
// If jsdom still doesn't provide one, we polyfill a simple in-memory Storage.
const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
if (desc && !desc.value && desc.configurable) {
  delete (globalThis as Record<string, unknown>).localStorage
}

if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map<string, string>()
  const localStoragePolyfill: Storage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStoragePolyfill,
    configurable: true,
    writable: true,
  })
}
