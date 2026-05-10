<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProtocolsStore, parseProtocols } from '@/stores/protocols'
import type { Protocol } from '@/types/protocol'
import IconCheck from '@/icons/IconCheck.vue'

const DATA_KEY = 'interval-timer-data'
const URL_KEY = 'interval-timer-data-url'

const route = useRoute()
const router = useRouter()
const store = useProtocolsStore()

const status = ref<'loading' | 'preview' | 'success' | 'error'>('loading')
const errorMsg = ref('')
const incoming = ref<Protocol[]>([])
const incomingRaw = ref('')
const incomingUrl = ref('')
const importedCount = ref(0)

const currentCount = computed(() => store.protocols.length)

onMounted(async () => {
  const raw = route.query.id
  const id = Array.isArray(raw) ? raw[0] : raw ?? undefined
  if (!id) {
    errorMsg.value = 'No import ID provided.'
    status.value = 'error'
    return
  }

  try {
    const res = await fetch(`https://dpaste.com/${id}.txt`)
    if (!res.ok) throw new Error(`Could not fetch paste (${res.status})`)

    const text = await res.text()
    const parsed = parseProtocols(text) // validates structure before committing
    incoming.value = parsed
    incomingRaw.value = text
    incomingUrl.value = `https://dpaste.com/${id}`
    status.value = 'preview'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Import failed.'
    status.value = 'error'
  }
})

function confirmImport() {
  localStorage.setItem(DATA_KEY, incomingRaw.value)
  localStorage.setItem(URL_KEY, incomingUrl.value)
  store.loadFromStorage()
  importedCount.value = incoming.value.length
  status.value = 'success'
}

function cancelImport() {
  router.replace('/')
}
</script>

<template>
  <div class="import-page">
    <div v-if="status === 'loading'" class="state">
      <span class="spinner">◎</span>
      <p class="state-text">Fetching timers…</p>
    </div>
    <div v-else-if="status === 'preview'" class="state state--preview">
      <h2 class="preview-title">Review import</h2>
      <p class="preview-sub">
        {{ incoming.length }} timer{{ incoming.length === 1 ? '' : 's' }} ready to import.
        This will replace your {{ currentCount }} current timer{{ currentCount === 1 ? '' : 's' }}.
      </p>
      <ul class="preview-list">
        <li v-for="(p, i) in incoming" :key="p.id" class="preview-item">
          <span class="preview-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="preview-name">{{ p.name || 'Untitled' }}</span>
          <span class="preview-meta">
            {{ p.intervals.length }} interval{{ p.intervals.length === 1 ? '' : 's' }}
            · {{ p.sets }} set{{ p.sets === 1 ? '' : 's' }}
          </span>
        </li>
      </ul>
      <div class="preview-actions">
        <button class="back-btn" @click="cancelImport">Cancel</button>
        <button class="back-btn back-btn--primary" @click="confirmImport">Import</button>
      </div>
    </div>
    <div v-else-if="status === 'success'" class="state">
      <span class="success-icon" aria-hidden="true">
        <IconCheck />
      </span>
      <p class="state-text state-text--ok">Imported {{ importedCount }} timer{{ importedCount === 1 ? '' : 's' }}</p>
      <button class="back-btn back-btn--primary" @click="router.replace('/')">Continue</button>
    </div>
    <div v-else class="state">
      <p class="state-error">{{ errorMsg }}</p>
      <button class="back-btn" @click="router.replace('/')">Go home</button>
    </div>
  </div>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1.25rem;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.state--preview {
  width: 100%;
  max-width: 480px;
  align-items: stretch;
}

.preview-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--text);
  text-transform: uppercase;
  margin: 0;
  text-align: center;
}

.preview-sub {
  font-size: 0.82rem;
  color: var(--text-dim);
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

.preview-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  max-height: 50vh;
  overflow-y: auto;
}

.preview-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-index {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.preview-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.preview-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.spinner {
  font-size: 2.5rem;
  color: var(--accent);
  animation: spin 1.5s linear infinite;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.state-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin: 0;
}

.state-text--ok {
  color: var(--text);
}

.success-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  animation: pop 0.35s ease-out;
}

.success-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

@keyframes pop {
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}

.state-error {
  font-size: 0.85rem;
  color: var(--accent-red);
  margin: 0;
}

.back-btn {
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  padding: 0.45rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
}

.back-btn:hover {
  color: var(--text);
  border-color: var(--text-dim);
}

.back-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-on);
}

.back-btn--primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--accent-on);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}
</style>
