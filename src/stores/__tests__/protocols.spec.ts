import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useProtocolsStore } from '@/stores/protocols'
import { defaultProtocols } from '@/data/defaultProtocols'
import type { Protocol } from '@/types/protocol'

const mockProtocol: Protocol = {
  id: 'test-1',
  name: 'Test Timer',
  description: 'A test timer',
  sets: 3,
  prepTime: 10,
  restBetweenSets: 30,
  intervals: [{ label: 'Work', duration: 45 }],
}

describe('useProtocolsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('initialization', () => {
    it('loads default protocols when localStorage is empty', () => {
      const store = useProtocolsStore()
      expect(store.protocols).toHaveLength(defaultProtocols.length)
      expect(store.protocols[0]?.id).toBe(defaultProtocols[0]?.id)
    })

    it('loads from localStorage when data is present', () => {
      localStorage.setItem('exercise-timer-protocols', JSON.stringify([mockProtocol]))
      const store = useProtocolsStore()
      expect(store.protocols).toHaveLength(1)
      expect(store.protocols[0]?.name).toBe('Test Timer')
    })
  })

  describe('addProtocol', () => {
    it('appends protocol to the list', () => {
      const store = useProtocolsStore()
      const before = store.protocols.length
      store.addProtocol(mockProtocol)
      expect(store.protocols).toHaveLength(before + 1)
      expect(store.protocols[store.protocols.length - 1]?.id).toBe('test-1')
    })
  })

  describe('removeProtocol', () => {
    it('removes protocol by id', () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      store.removeProtocol('test-1')
      expect(store.protocols.find((p) => p.id === 'test-1')).toBeUndefined()
    })

    it('is a no-op for unknown id', () => {
      const store = useProtocolsStore()
      const count = store.protocols.length
      store.removeProtocol('nonexistent')
      expect(store.protocols).toHaveLength(count)
    })
  })

  describe('updateProtocol', () => {
    it('replaces the matching protocol in-place', () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      store.updateProtocol('test-1', { ...mockProtocol, name: 'Updated' })
      const updated = store.protocols.find((p) => p.id === 'test-1')
      expect(updated?.name).toBe('Updated')
    })

    it('does not change list length', () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      const count = store.protocols.length
      store.updateProtocol('test-1', { ...mockProtocol, name: 'Updated' })
      expect(store.protocols).toHaveLength(count)
    })

    it('is a no-op for unknown id', () => {
      const store = useProtocolsStore()
      const count = store.protocols.length
      store.updateProtocol('nonexistent', mockProtocol)
      expect(store.protocols).toHaveLength(count)
    })
  })

  describe('resetToDefaults', () => {
    it('restores default protocols regardless of current state', () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      store.addProtocol({ ...mockProtocol, id: 'test-2' })
      store.resetToDefaults()
      expect(store.protocols).toHaveLength(defaultProtocols.length)
      expect(store.protocols.map((p) => p.id)).toEqual(defaultProtocols.map((p) => p.id))
    })
  })

  describe('localStorage persistence', () => {
    it('persists added protocols to localStorage', async () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      await nextTick()
      const stored: Protocol[] = JSON.parse(
        localStorage.getItem('exercise-timer-protocols') ?? '[]',
      )
      expect(stored.some((p) => p.id === 'test-1')).toBe(true)
    })

    it('persists removal to localStorage', async () => {
      const store = useProtocolsStore()
      store.addProtocol(mockProtocol)
      store.removeProtocol('test-1')
      await nextTick()
      const stored: Protocol[] = JSON.parse(
        localStorage.getItem('exercise-timer-protocols') ?? '[]',
      )
      expect(stored.some((p) => p.id === 'test-1')).toBe(false)
    })
  })
})
