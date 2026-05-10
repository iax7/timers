import { ref } from 'vue'
import type { SoundTheme } from './themes'

export function useAudio(getTheme: () => SoundTheme) {
  const ctx = ref<AudioContext | null>(null)

  function init() {
    if (!ctx.value) ctx.value = new AudioContext()
    if (ctx.value.state === 'suspended') ctx.value.resume()
  }

  function close() {
    ctx.value?.close()
    ctx.value = null
  }

  function withCtx(fn: (ctx: AudioContext) => void) {
    if (!ctx.value) return
    if (ctx.value.state === 'suspended') ctx.value.resume()
    fn(ctx.value)
  }

  return {
    init,
    close,
    countdownBeep: () => withCtx((c) => getTheme().countdownBeep(c)),
    phaseChange: () => withCtx((c) => getTheme().phaseChange(c)),
    workoutComplete: () => withCtx((c) => getTheme().workoutComplete(c)),
  }
}
