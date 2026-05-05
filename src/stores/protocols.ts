import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Protocol } from '@/types/protocol'
import { defaultProtocols } from '@/data/defaultProtocols'

const STORAGE_KEY = 'interval-timer-data'

export function parseProtocols(json: string): Protocol[] {
  const data = JSON.parse(json) as unknown
  if (!Array.isArray(data)) throw new Error('Expected an array of protocols')
  data.forEach((p, i) => {
    if (
      typeof p !== 'object' || p === null ||
      typeof (p as Record<string, unknown>).id !== 'string' ||
      typeof (p as Record<string, unknown>).name !== 'string' ||
      !Array.isArray((p as Record<string, unknown>).intervals)
    ) throw new Error(`Invalid protocol at index ${i}`)
  })
  return data as Protocol[]
}

export const useProtocolsStore = defineStore('protocols', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const protocols = ref<Protocol[]>(stored ? parseProtocols(stored) : [...defaultProtocols])

  watch(
    protocols,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        console.error('Failed to persist protocols: storage quota exceeded')
      }
    },
    { deep: true },
  )

  function addProtocol(protocol: Protocol) {
    protocols.value.push(protocol)
  }

  function removeProtocol(id: string) {
    protocols.value = protocols.value.filter((p) => p.id !== id)
  }

  function updateProtocol(id: string, updated: Protocol) {
    const index = protocols.value.findIndex((p) => p.id === id)
    if (index !== -1) protocols.value.splice(index, 1, updated)
  }

  function resetToDefaults() {
    protocols.value = [...defaultProtocols]
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY)
    protocols.value = raw ? parseProtocols(raw) : [...defaultProtocols]
  }

  return { protocols, addProtocol, removeProtocol, updateProtocol, resetToDefaults, loadFromStorage }
})
