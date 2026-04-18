import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProtocolCard from '../ProtocolCard.vue'
import type { Protocol } from '@/types/protocol'

const tabata: Protocol = {
  id: 'tabata',
  name: 'Tabata Protocol',
  description: '8 sets of 20s high intensity work',
  sets: 8,
  prepTime: 10,
  restBetweenSets: 10,
  intervals: [{ label: 'Work hard!', duration: 20 }],
}

// Total = prepTime + sets * intervalSum + (sets - 1) * restBetweenSets
// Tabata = 10 + 8*20 + 7*10 = 240s = 4:00

describe('ProtocolCard', () => {
  describe('rendering', () => {
    it('displays protocol name', () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      expect(wrapper.find('.card-name').text()).toBe('Tabata Protocol')
    })

    it('displays protocol description', () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      expect(wrapper.text()).toContain('8 sets of 20s high intensity work')
    })

    it('displays set count and prep time in footer', () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      expect(wrapper.text()).toContain('8')
      expect(wrapper.text()).toContain('10s')
    })
  })

  describe('total duration formula', () => {
    it('computes tabata total: prepTime + sets * intervalSum + (sets-1) * rest', () => {
      // 10 + 8*20 + 7*10 = 240s = 4:00
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      expect(wrapper.find('.card-total').text()).toBe('4:00')
    })

    it('computes multi-interval total correctly', () => {
      const protocol: Protocol = {
        id: 'multi',
        name: 'Multi',
        description: '',
        sets: 3,
        prepTime: 15,
        restBetweenSets: 30,
        intervals: [
          { label: 'Work', duration: 40 },
          { label: 'Cool', duration: 20 },
        ],
      }
      // 15 + 3*(40+20) + 2*30 = 15 + 180 + 60 = 255s = 4:15
      const wrapper = mount(ProtocolCard, { props: { protocol } })
      expect(wrapper.find('.card-total').text()).toBe('4:15')
    })

    it('handles single set with no rest', () => {
      const protocol: Protocol = {
        id: 'single',
        name: 'Single',
        description: '',
        sets: 1,
        prepTime: 5,
        restBetweenSets: 60,
        intervals: [{ label: 'Go', duration: 30 }],
      }
      // 5 + 1*30 + 0*60 = 35s
      const wrapper = mount(ProtocolCard, { props: { protocol } })
      expect(wrapper.find('.card-total').text()).toBe('35s')
    })
  })

  describe('events', () => {
    it('emits select when card is clicked', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('emits edit when edit button is clicked', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-edit').trigger('click')
      expect(wrapper.emitted('edit')).toBeTruthy()
    })

    it('does not emit select when edit button is clicked', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-edit').trigger('click')
      expect(wrapper.emitted('select')).toBeFalsy()
    })
  })

  describe('delete confirmation flow', () => {
    it('shows confirm dialog after clicking DELETE', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-delete').trigger('click')
      expect(wrapper.find('.card-confirm').exists()).toBe(true)
      expect(wrapper.find('.card-delete').exists()).toBe(false)
    })

    it('emits delete with protocol id when confirmed', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-delete').trigger('click')
      await wrapper.find('.card-confirm-btn--yes').trigger('click')
      expect(wrapper.emitted('delete')?.[0]).toEqual(['tabata'])
    })

    it('hides confirm and does not emit when cancelled', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-delete').trigger('click')
      await wrapper.find('.card-confirm-btn--no').trigger('click')
      expect(wrapper.emitted('delete')).toBeFalsy()
      expect(wrapper.find('.card-confirm').exists()).toBe(false)
      expect(wrapper.find('.card-delete').exists()).toBe(true)
    })

    it('does not emit select when confirm dialog is clicked', async () => {
      const wrapper = mount(ProtocolCard, { props: { protocol: tabata } })
      await wrapper.find('.card-delete').trigger('click')
      await wrapper.find('.card-confirm').trigger('click')
      expect(wrapper.emitted('select')).toBeFalsy()
    })
  })
})
