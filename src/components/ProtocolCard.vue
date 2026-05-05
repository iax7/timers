<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Protocol } from '@/types/protocol'

const props = defineProps<{ protocol: Protocol }>()
const emit = defineEmits<{ delete: [id: string]; select: []; edit: [] }>()

const confirming = ref(false)
let cancelTimer: ReturnType<typeof setTimeout>

function requestDelete() {
  confirming.value = true
  cancelTimer = setTimeout(() => { confirming.value = false }, 3000)
}

function confirmDelete() {
  clearTimeout(cancelTimer)
  confirming.value = false
  emit('delete', props.protocol.id)
}

function cancelDelete() {
  clearTimeout(cancelTimer)
  confirming.value = false
}

const COLORS = ['#1aff7a', '#ff7a1a', '#ff3a5c', '#00c8ff', '#c084fc', '#ffd700']

function intervalColor(index: number) {
  return COLORS[index % COLORS.length]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`
}

const intervalSum = computed(() =>
  props.protocol.intervals.reduce((acc, i) => acc + i.duration, 0),
)

const totalDuration = computed(() => {
  const { prepTime, sets, restBetweenSets } = props.protocol
  return prepTime + sets * intervalSum.value + (sets - 1) * restBetweenSets
})

const cycleTotal = computed(() => intervalSum.value + props.protocol.restBetweenSets)
</script>

<template>
  <article class="card" :style="{ '--card-accent': intervalColor(0) }" @click="emit('select')" role="button" tabindex="0" @keydown.enter="emit('select')">
    <div class="card-top">
      <div class="card-header">
        <h2 class="card-name">{{ protocol.name }}</h2>
        <span class="card-total">{{ formatTime(totalDuration) }}</span>
      </div>
      <p class="card-desc">{{ protocol.description }}</p>
    </div>

    <div class="card-bars">
      <div
        v-for="(interval, i) in protocol.intervals"
        :key="i"
        class="card-bar"
        :style="{ flex: interval.duration, background: intervalColor(i) }"
        :title="`${interval.label}: ${formatTime(interval.duration)}`"
      />
      <div
        v-if="protocol.restBetweenSets > 0"
        class="card-bar card-bar--rest"
        :style="{ flex: protocol.restBetweenSets }"
        :title="`Rest: ${formatTime(protocol.restBetweenSets)}`"
      />
    </div>

    <div class="card-intervals">
      <div
        v-for="(interval, i) in protocol.intervals"
        :key="i"
        class="card-interval-row"
      >
        <span class="card-interval-dot" :style="{ background: intervalColor(i) }" />
        <span class="card-interval-label">{{ interval.label }}</span>
        <span class="card-interval-duration">{{ formatTime(interval.duration) }}</span>
      </div>
      <div v-if="protocol.restBetweenSets > 0" class="card-interval-row card-interval-row--rest">
        <span class="card-interval-dot card-interval-dot--rest" />
        <span class="card-interval-label">Rest between sets</span>
        <span class="card-interval-duration">{{ formatTime(protocol.restBetweenSets) }}</span>
      </div>
    </div>

    <footer class="card-footer">
      <span class="card-stat">
        <strong>{{ protocol.sets }}</strong> sets
      </span>
      <span class="card-sep">·</span>
      <span class="card-stat">
        <strong>{{ formatTime(protocol.prepTime) }}</strong> prep
      </span>
      <span class="card-sep">·</span>
      <span class="card-stat">
        <strong>{{ formatTime(cycleTotal) }}</strong> /set
      </span>
    </footer>

    <div class="card-actions" :class="{ 'card-actions--open': confirming }" @click.stop>
      <button class="card-edit" @click="emit('edit')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        EDIT
      </button>
      <div class="card-delete-zone">
        <Transition name="confirm">
          <div v-if="confirming" class="card-confirm">
            <span class="card-confirm-text">Delete?</span>
            <button class="card-confirm-btn card-confirm-btn--yes" @click="confirmDelete">Yes</button>
            <button class="card-confirm-btn card-confirm-btn--no" @click="cancelDelete">No</button>
          </div>
          <button v-else class="card-delete" @click="requestDelete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
            </svg>
            DELETE
          </button>
        </Transition>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--card-accent, var(--accent));
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}

.card:hover {
  border-color: var(--card-accent, var(--accent));
  box-shadow: 0 0 24px color-mix(in srgb, var(--card-accent, var(--accent)) 18%, transparent);
  transform: translateY(-1px);
}

.card:active {
  transform: translateY(0);
}

.card-top {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  opacity: 0;
  transition: opacity 0.15s;
}

.card:hover .card-actions,
.card-actions--open {
  opacity: 1;
}

.card-delete-zone {
  display: grid;
  place-items: center;
}

.card-delete-zone > * {
  grid-area: 1 / 1;
}

.card-edit,
.card-delete {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: color 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, transform 0.15s ease-out;
  line-height: 1.4;
}

.card-edit svg,
.card-delete svg {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

.card-edit:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.card-delete:hover {
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.card-confirm {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.card-confirm-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  color: var(--accent-red);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.card-confirm-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.4rem;
  border: 1px solid;
  cursor: pointer;
  background: transparent;
  transition: background 0.18s ease-out, color 0.18s ease-out, transform 0.15s ease-out;
  line-height: 1.4;
}

.card-confirm-btn--yes {
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.card-confirm-btn--yes:hover {
  background: var(--accent-red);
  color: #fff;
}

.card-confirm-btn--no {
  color: var(--text-muted);
  border-color: var(--border-bright);
}

.card-confirm-btn--no:hover {
  color: var(--text);
}

/* Confirm zone transition */
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.15s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--text);
  text-transform: uppercase;
  line-height: 1.1;
  margin: 0;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-total {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--card-accent, var(--accent));
  flex-shrink: 0;
  white-space: nowrap;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.card-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-bars {
  display: flex;
  height: 4px;
  gap: 2px;
  border-radius: 2px;
  overflow: hidden;
}

.card-bar {
  height: 100%;
  border-radius: 1px;
  opacity: 0.8;
}

.card-bar--rest {
  background: var(--text-muted) !important;
  opacity: 0.3;
}

.card-intervals {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.card-interval-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.card-interval-row--rest {
  opacity: 0.5;
}

.card-interval-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-interval-dot--rest {
  background: var(--text-muted) !important;
}

.card-interval-label {
  font-size: 0.78rem;
  color: var(--text-dim);
  flex: 1;
  letter-spacing: 0.01em;
}

.card-interval-duration {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 500;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.card-stat {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.card-stat strong {
  color: var(--text-dim);
  font-weight: 600;
}

.card-sep {
  color: var(--text-muted);
  font-size: 0.65rem;
}
</style>
