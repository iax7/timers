export interface SoundTheme {
  id: string
  name: string
  description: string
  countdownBeep: (ctx: AudioContext) => void
  phaseChange: (ctx: AudioContext) => void
  workoutComplete: (ctx: AudioContext) => void
}

function playTone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.3,
) {
  if (ctx.state === 'suspended') ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + dur)
}

interface Note {
  freq: number
  dur: number
  type?: OscillatorType
  vol?: number
}

function playSequence(ctx: AudioContext, notes: Note[], gapMs: number) {
  notes.forEach((n, i) =>
    setTimeout(() => playTone(ctx, n.freq, n.dur, n.type, n.vol), i * gapMs),
  )
}

/* Themes */

/*
 * Identity:  The original, soft sines
 * Waveforms: sine + subtle square
 * Notes:     C-E-G-C complete
 */
const minimal: SoundTheme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Soft sine tones, the original',
  countdownBeep: (ctx) => playTone(ctx, 1100, 0.07, 'square', 0.18),
  phaseChange: (ctx) => {
    playTone(ctx, 660, 0.1, 'sine', 0.28)
    setTimeout(() => playTone(ctx, 990, 0.18, 'sine', 0.32), 120)
  },
  workoutComplete: (ctx) =>
    playSequence(
      ctx,
      [523, 659, 784, 1047].map((freq) => ({ freq, dur: 0.28, type: 'sine', vol: 0.38 })),
      110,
    ),
}

/*
 * Identity:  Punchy, energetic
 * Waveforms: sawtooth + triangle
 * Notes:     Low double-thump phase, power-fanfare complete
 */
const gym: SoundTheme = {
  id: 'gym',
  name: 'Gym',
  description: 'Punchy buzz tones, energetic',
  countdownBeep: (ctx) => playTone(ctx, 880, 0.08, 'sawtooth', 0.22),
  phaseChange: (ctx) => {
    playTone(ctx, 250, 0.18, 'triangle', 0.3)
    setTimeout(() => playTone(ctx, 250, 0.18, 'triangle', 0.3), 230)
  },
  workoutComplete: (ctx) =>
    playSequence(
      ctx,
      [392, 523, 784, 1175].map((freq) => ({ freq, dur: 0.25, type: 'sawtooth', vol: 0.35 })),
      90,
    ),
}

/*
 * Identity:  Calm, meditative
 * Waveforms: sustained sines
 * Notes:     Ascending pentatonic complete
 */
const zen: SoundTheme = {
  id: 'zen',
  name: 'Zen',
  description: 'Calm sustained sines, meditative',
  countdownBeep: (ctx) => playTone(ctx, 660, 0.2, 'sine', 0.15),
  phaseChange: (ctx) => {
    playTone(ctx, 440, 0.4, 'sine', 0.2)
    setTimeout(() => playTone(ctx, 587, 0.5, 'sine', 0.22), 200)
  },
  workoutComplete: (ctx) =>
    playSequence(
      ctx,
      [392, 440, 523, 587, 784].map((freq) => ({ freq, dur: 0.5, type: 'sine', vol: 0.28 })),
      180,
    ),
}

/*
 * Identity:  8-bit nostalgia
 * Waveforms: square waves
 * Notes:     1up jingle complete
 */
const retro: SoundTheme = {
  id: 'retro',
  name: 'Retro 8-bit',
  description: 'Square wave chiptune blips',
  countdownBeep: (ctx) => playTone(ctx, 1500, 0.05, 'square', 0.2),
  phaseChange: (ctx) => {
    playTone(ctx, 988, 0.08, 'square', 0.25)
    setTimeout(() => playTone(ctx, 1319, 0.12, 'square', 0.25), 90)
  },
  workoutComplete: (ctx) =>
    playSequence(
      ctx,
      [659, 784, 1319, 1047, 1175, 1568].map((freq) => ({
        freq,
        dur: 0.1,
        type: 'square',
        vol: 0.28,
      })),
      70,
    ),
}

export const themes: SoundTheme[] = [minimal, gym, zen, retro]

export function getThemeById(id: string): SoundTheme {
  return themes.find((t) => t.id === id) ?? minimal
}
