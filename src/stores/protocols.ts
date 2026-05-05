import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Protocol } from '@/types/protocol'
import { defaultProtocols } from '@/data/defaultProtocols'

const STORAGE_KEY = 'interval-timer-data'

export const useProtocolsStore = defineStore('protocols', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const protocols = ref<Protocol[]>(stored ? JSON.parse(stored) : [...defaultProtocols])

  watch(
    protocols,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
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
    protocols.value = raw ? JSON.parse(raw) : [...defaultProtocols]
  }

  return { protocols, addProtocol, removeProtocol, updateProtocol, resetToDefaults, loadFromStorage }
})
