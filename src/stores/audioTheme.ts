import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { themes, getThemeById } from '@/audio/themes'

const STORAGE_KEY = 'interval-timer-audio-theme'

export const useAudioThemeStore = defineStore('audioTheme', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const initialId = stored && themes.some((t) => t.id === stored) ? stored : themes[0]!.id
  const themeId = ref<string>(initialId)

  const currentTheme = computed(() => getThemeById(themeId.value))

  watch(themeId, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val)
    } catch {
      console.error('Failed to persist audio theme: storage quota exceeded')
    }
  })

  function setTheme(id: string) {
    if (themes.some((t) => t.id === id)) themeId.value = id
  }

  return { themeId, currentTheme, setTheme }
})
