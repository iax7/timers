<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProtocolsStore } from '@/stores/protocols'
import { useAudioThemeStore } from '@/stores/audioTheme'
import { useAudio } from '@/audio/useAudio'
import IconRestart from '@/icons/IconRestart.vue'
import IconArrowLeft from '@/icons/IconArrowLeft.vue'
import IconChevronLeft from '@/icons/IconChevronLeft.vue'
import IconCheck from '@/icons/IconCheck.vue'
import IconPlay from '@/icons/IconPlay.vue'
import IconPause from '@/icons/IconPause.vue'
import confetti from 'canvas-confetti'

const route = useRoute()
const router = useRouter()
const store = useProtocolsStore()
const audioTheme = useAudioThemeStore()
const audio = useAudio(() => audioTheme.currentTheme)

const protocol = computed(() => store.protocols.find((p) => p.id === route.params.id))

// ─── Timer state ──────────────────────────────────────────
type Phase = 'prep' | 'interval' | 'rest' | 'complete'

const phase = ref<Phase>('prep')
const currentSet = ref(1)
const currentIntervalIndex = ref(0)
const elapsed = ref(0) // ms elapsed in current phase
const isPaused = ref(false)
const isStarted = ref(false)

// rAF control
let rafId: number | null = null
let phaseStart: number | null = null
let pausedAt = 0
let lastBeepSecond = -1

// ─── Wake Lock ────────────────────────────────────────────
let wakeLock: WakeLockSentinel | null = null

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
  } catch {
    // permission denied or feature unavailable — fail silently
  }
}

function releaseWakeLock() {
  wakeLock?.release()
  wakeLock = null
}

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && isStarted.value && !isPaused.value && phase.value !== 'complete') {
    await acquireWakeLock()
  }
}

// ─── Haptics ──────────────────────────────────────────────
function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern)
}

// ─── Confetti ─────────────────────────────────────────────
const CONF_COLORS = ['#1aff7a', '#ff7a1a', '#ff3a5c', '#00c8ff', '#c084fc', '#ffd700']

function launchConfetti() {
  const opts = { particleCount: 80, spread: 70, colors: CONF_COLORS }
  confetti({ ...opts, origin: { x: 0.2, y: 0.6 }, angle: 60 })
  confetti({ ...opts, origin: { x: 0.8, y: 0.6 }, angle: 120 })
  setTimeout(() => confetti({ particleCount: 60, spread: 100, colors: CONF_COLORS, origin: { x: 0.5, y: 0.3 } }), 300)
}

// ─── Phase metadata ───────────────────────────────────────
const COLORS = ['#1aff7a', '#ff7a1a', '#ff3a5c', '#00c8ff', '#c084fc', '#ffd700']
const PREP_COLOR = '#ffd700'
const REST_COLOR = '#6060c0'

const currentPhaseColor = computed(() => {
  if (!protocol.value) return PREP_COLOR
  if (phase.value === 'prep') return PREP_COLOR
  if (phase.value === 'rest') return REST_COLOR
  if (phase.value === 'complete') return '#1aff7a'
  return COLORS[currentIntervalIndex.value % COLORS.length]
})

const currentPhaseDurationMs = computed(() => {
  if (!protocol.value) return 0
  if (phase.value === 'prep') return protocol.value.prepTime * 1000
  if (phase.value === 'interval')
    return (protocol.value.intervals[currentIntervalIndex.value]?.duration ?? 0) * 1000
  if (phase.value === 'rest') return protocol.value.restBetweenSets * 1000
  return 0
})

const currentPhaseLabel = computed(() => {
  if (!protocol.value) return ''
  if (phase.value === 'prep') return 'GET READY'
  if (phase.value === 'rest') return 'REST'
  if (phase.value === 'complete') return 'DONE!'
  return (protocol.value.intervals[currentIntervalIndex.value]?.label ?? '').toUpperCase()
})

// ─── SVG ring ─────────────────────────────────────────────
const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 753.98

const ringProgress = computed(() => {
  if (phase.value === 'complete') return 0
  if (currentPhaseDurationMs.value === 0) return 0
  return Math.min(1, elapsed.value / currentPhaseDurationMs.value)
})

const ringDashoffset = computed(() => CIRCUMFERENCE * ringProgress.value)

// ─── Display time ─────────────────────────────────────────
const phaseRemainingMs = computed(() =>
  Math.max(0, currentPhaseDurationMs.value - elapsed.value),
)

const displayTime = computed(() => {
  const totalSec = Math.ceil(phaseRemainingMs.value / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// ─── Total remaining / elapsed ───────────────────────────
const totalRemainingS = computed(() => {
  if (!protocol.value || phase.value === 'complete') return 0
  const p = protocol.value
  const intervalSum = p.intervals.reduce((a, i) => a + i.duration, 0)
  let total = Math.ceil(phaseRemainingMs.value / 1000)

  if (phase.value === 'prep') {
    total += p.sets * intervalSum + (p.sets - 1) * p.restBetweenSets
  } else if (phase.value === 'interval') {
    const remainingInSet = p.intervals
      .slice(currentIntervalIndex.value + 1)
      .reduce((a, i) => a + i.duration, 0)
    const setsLeft = p.sets - currentSet.value
    total += remainingInSet + setsLeft * (intervalSum + p.restBetweenSets)
  } else if (phase.value === 'rest') {
    const setsLeft = p.sets - currentSet.value
    total += setsLeft * (intervalSum + p.restBetweenSets)
  }

  return Math.max(0, total)
})

const totalElapsedS = computed(() => {
  if (!protocol.value) return 0
  const p = protocol.value
  const intervalSum = p.intervals.reduce((a, i) => a + i.duration, 0)
  const totalWorkout = p.prepTime + p.sets * intervalSum + (p.sets - 1) * p.restBetweenSets
  if (phase.value === 'complete') return totalWorkout
  return Math.max(0, totalWorkout - totalRemainingS.value)
})

function formatTotalTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec}s`
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ─── Set dots ─────────────────────────────────────────────
function setStatus(n: number): 'done' | 'active' | 'upcoming' {
  if (phase.value === 'complete') return 'done'
  if (phase.value === 'rest') return n <= currentSet.value ? 'done' : 'upcoming'
  if (n < currentSet.value) return 'done'
  if (n === currentSet.value) return 'active'
  return 'upcoming'
}

const setProgress = computed(() => {
  if (!protocol.value || phase.value !== 'interval') return 0
  const p = protocol.value
  const intervalSum = p.intervals.reduce((a, i) => a + i.duration, 0)
  if (intervalSum === 0) return 0
  const completedInSet = p.intervals
    .slice(0, currentIntervalIndex.value)
    .reduce((a, i) => a + i.duration, 0)
  return Math.min(1, (completedInSet + elapsed.value / 1000) / intervalSum)
})

// ─── Timer engine ─────────────────────────────────────────
function advance() {
  if (!protocol.value) return
  const p = protocol.value

  if (phase.value === 'prep') {
    phase.value = 'interval'
    currentIntervalIndex.value = 0
  } else if (phase.value === 'interval') {
    const nextIdx = currentIntervalIndex.value + 1
    if (nextIdx < p.intervals.length) {
      currentIntervalIndex.value = nextIdx
    } else if (currentSet.value < p.sets) {
      if (p.restBetweenSets > 0) {
        phase.value = 'rest'
      } else {
        currentSet.value++
        currentIntervalIndex.value = 0
      }
    } else {
      phase.value = 'complete'
      elapsed.value = 0
      audio.workoutComplete()
      vibrate([300, 100, 300, 100, 300])
      launchConfetti()
      releaseWakeLock()
      return
    }
  } else if (phase.value === 'rest') {
    currentSet.value++
    currentIntervalIndex.value = 0
    phase.value = 'interval'
  }

  audio.phaseChange()
  vibrate([200, 100, 200])
  lastBeepSecond = -1
  elapsed.value = 0
  pausedAt = 0
  phaseStart = null

  if (!isPaused.value) {
    rafId = requestAnimationFrame(tick)
  }
}

function tick(timestamp: number) {
  if (phaseStart === null) phaseStart = timestamp
  elapsed.value = pausedAt + (timestamp - phaseStart)

  // Countdown beep for last 3 seconds of each phase
  const secondsLeft = Math.ceil((currentPhaseDurationMs.value - elapsed.value) / 1000)
  if (secondsLeft !== lastBeepSecond && secondsLeft >= 1 && secondsLeft <= 3) {
    lastBeepSecond = secondsLeft
    audio.countdownBeep()
  }

  if (elapsed.value >= currentPhaseDurationMs.value) {
    elapsed.value = currentPhaseDurationMs.value
    advance()
    return
  }

  rafId = requestAnimationFrame(tick)
}

function startTimer() {
  lastBeepSecond = -1
  phaseStart = null
  rafId = requestAnimationFrame(tick)
}

function togglePause() {
  if (!isStarted.value || phase.value === 'complete') return
  if (isPaused.value) {
    isPaused.value = false
    pausedAt = elapsed.value
    phaseStart = null
    rafId = requestAnimationFrame(tick)
    acquireWakeLock()
  } else {
    isPaused.value = true
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    pausedAt = elapsed.value
    releaseWakeLock()
  }
}

function handleStart() {
  audio.init()
  isStarted.value = true
  startTimer()
  acquireWakeLock()
}

function restartTimer() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  phase.value = 'prep'
  currentSet.value = 1
  currentIntervalIndex.value = 0
  elapsed.value = 0
  isPaused.value = false
  pausedAt = 0
  phaseStart = null
  lastBeepSecond = -1
  audio.init()
  isStarted.value = true
  startTimer()
  acquireWakeLock()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  audio.close()
  releaseWakeLock()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="timer-page">
    <header class="site-header">
      <div class="site-header-inner">
        <button class="back-btn" @click="router.replace('/')">
          <IconChevronLeft />
          Back
        </button>
        <span class="page-title">{{ protocol?.name ?? 'Timer' }}</span>
      </div>
    </header>

    <template v-if="protocol">
      <div class="timer-body">
        <!-- Ring -->
        <div class="ring-wrapper">
          <div
            class="ring-glow"
            :style="{ background: `radial-gradient(circle, ${currentPhaseColor}22 0%, transparent 70%)` }"
          />
          <svg
            class="ring-svg"
            viewBox="0 0 300 300"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="150"
              cy="150"
              :r="RADIUS"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              stroke-width="16"
            />
            <circle
              class="ring-progress"
              cx="150"
              cy="150"
              :r="RADIUS"
              fill="none"
              stroke-width="16"
              stroke-linecap="butt"
              :stroke="currentPhaseColor"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="ringDashoffset"
            />
          </svg>

          <div class="ring-center">
            <div class="ring-time" :style="{ color: currentPhaseColor }">
              {{ phase === 'complete' ? '0:00' : displayTime }}
            </div>
            <div class="ring-phase">{{ currentPhaseLabel }}</div>
          </div>
        </div>

        <!-- Set indicators -->
        <div class="sets-row">
          <div
            v-for="n in protocol.sets"
            :key="n"
            class="set-dot"
            :class="[`set-dot--${setStatus(n)}`, { 'set-dot--pulsing': setStatus(n) === 'active' && isStarted && !isPaused }]"
            :style="setStatus(n) === 'active'
            ? { borderColor: currentPhaseColor, color: currentPhaseColor, '--pulse-color': currentPhaseColor, '--set-progress': setProgress }
            : {}"
          >
            <IconCheck v-if="setStatus(n) === 'done'" class="check-icon" />
            <span v-else>{{ n }}</span>
          </div>
        </div>

        <!-- Totals -->
        <div class="total-row">
          <div class="total-stat">
            <span class="total-label">TIME REMAINING</span>
            <span class="total-time" :class="{ 'total-time--faded': phase === 'complete' }">
              {{ formatTotalTime(totalRemainingS) }}
            </span>
          </div>
          <div class="total-sep" />
          <div class="total-stat">
            <span class="total-label">TIME ELAPSED</span>
            <span class="total-time">{{ formatTotalTime(totalElapsedS) }}</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="controls">
          <!-- Not yet started -->
          <button v-if="!isStarted" class="start-btn" @click="handleStart">
            <IconPlay class="ctrl-icon" />
            START
          </button>

          <!-- Running or paused -->
          <button
            v-else-if="phase !== 'complete'"
            class="pause-btn"
            :class="{ 'pause-btn--paused': isPaused }"
            @click="togglePause"
          >
            <IconPause v-if="!isPaused" class="ctrl-icon" />
            <IconPlay v-else class="ctrl-icon" />
            {{ isPaused ? 'RESUME' : 'PAUSE' }}
          </button>

          <!-- Complete -->
          <template v-else>
            <button class="pause-btn pause-btn--done" @click="restartTimer">
              <IconRestart class="ctrl-icon" />
              RESTART
            </button>
            <button class="pause-btn pause-btn--done" @click="router.replace('/')">
              <IconArrowLeft class="ctrl-icon" />
              BACK TO TIMERS
            </button>
          </template>
        </div>
      </div>
    </template>

    <div v-else class="not-found">
      <p>Timer not found.</p>
      <button class="not-found-btn" @click="router.replace('/')">← Go back</button>
    </div>
  </div>
</template>

<style scoped>
.timer-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

/* Header */
.site-header {
  border-bottom: 1px solid var(--border);
  padding: 0 1.25rem;
  position: sticky;
  top: 0;
  background: rgba(12, 12, 20, 0.9);
  backdrop-filter: blur(8px);
  z-index: 10;
  flex-shrink: 0;
}

.site-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 3.5rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid var(--border-bright);
  border-radius: 6px;
  color: var(--text-dim);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  padding: 0.4rem 0.85rem;
  transition: background 0.18s ease-out, border-color 0.18s ease-out, color 0.18s ease-out, transform 0.15s ease-out;
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--text);
  border-color: var(--text-dim);
}

.page-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* Body layout */
.timer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 1.5rem;
  padding: 1.5rem 1.25rem 2rem;
}

@media (min-width: 640px) {
  .timer-body {
    gap: 2rem;
    padding: 2rem 1.25rem;
  }
}

/* Ring */
.ring-wrapper {
  position: relative;
  width: min(72vw, 340px);
  height: min(72vw, 340px);
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .ring-wrapper {
    width: min(55vw, 420px);
    height: min(55vw, 420px);
  }
}

.ring-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transition: background 0.5s ease;
}

.ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke 0.4s ease, stroke-dashoffset 0.05s linear;
}

/* Center of ring */
.ring-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}

.ring-time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(2.5rem, 12vw, 3.75rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  transition: color 0.4s ease;
}

.ring-phase {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(0.85rem, 3.5vw, 1.1rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  text-transform: uppercase;
}

/* Set dots */
.sets-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}

.set-dot {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
  padding-top: 0.1em;
  transition: all 0.35s ease;
  flex-shrink: 0;
}

.set-dot--done {
  background: var(--accent);
  color: var(--accent-on);
  border: 2px solid var(--accent);
}

.set-dot--active {
  border: 2px solid;
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--pulse-color, var(--accent)) 20%, transparent) 0deg,
    color-mix(in srgb, var(--pulse-color, var(--accent)) 20%, transparent) calc(var(--set-progress, 0) * 360deg),
    transparent calc(var(--set-progress, 0) * 360deg)
  );
}

.set-dot--pulsing {
  animation: dot-pulse 1.4s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 4px 0 var(--pulse-color, #1aff7a); }
  50%       { box-shadow: 0 0 18px 6px var(--pulse-color, #1aff7a); }
}

.set-dot--upcoming {
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
}

.check-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-on);
}

/* Totals */
.total-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.total-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.total-sep {
  width: 1px;
  height: 2rem;
  background: var(--border-bright);
  flex-shrink: 0;
}

.total-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.55rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  text-transform: uppercase;
  white-space: nowrap;
}

.total-time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-dim);
  transition: opacity 0.3s;
}

.total-time--faded {
  opacity: 0.3;
}

/* Start button */
.start-btn {
  width: 100%;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  background: var(--accent);
  border: none;
  color: var(--accent-on);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: background 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
}

.start-btn:hover  {
  background: var(--accent-hover);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
}
.start-btn:active { transform: scale(0.98); }

/* Controls */
.controls {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.pause-btn {
  width: 100%;
  height: 3.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: border-color 0.18s ease-out, color 0.18s ease-out, background 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
}

.pause-btn:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.pause-btn--paused {
  border-color: var(--accent);
  color: var(--accent);
}

.pause-btn--paused:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.pause-btn--done {
  border-color: var(--accent);
  color: var(--accent);
}

.pause-btn--done:hover {
  background: var(--accent);
  color: var(--accent-on);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.ctrl-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* Not found */
.not-found {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.not-found-btn {
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
  padding: 0.5rem 1.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.18s ease-out, color 0.18s ease-out, transform 0.15s ease-out;
}

.not-found-btn:hover {
  color: var(--text);
  border-color: var(--text-dim);
}
</style>
