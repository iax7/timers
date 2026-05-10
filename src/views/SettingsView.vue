<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProtocolsStore, parseProtocols } from '@/stores/protocols'
import IconChevronLeft from '@/icons/IconChevronLeft.vue'
import IconCopy from '@/icons/IconCopy.vue'
import IconCheck from '@/icons/IconCheck.vue'

const DATA_KEY = 'interval-timer-data'
const URL_KEY = 'interval-timer-data-url'
const DPASTE_API = 'https://dpaste.com/api/v2/'

const router = useRouter()
const store = useProtocolsStore()

const savedUrl = ref<string | null>(null)
const uploadState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const restoreState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref('')
const copied = ref(false)
const buildDate = __BUILD_DATE__
const buildTz = __BUILD_TZ__
const buildSha = __BUILD_SHA__

const shareUrl = computed(() => {
  if (!savedUrl.value) return null
  const id = savedUrl.value.split('/').filter(Boolean).pop()
  const base = window.location.href.split('#')[0]
  return `${base}#/import?id=${id}`
})

onMounted(() => {
  savedUrl.value = localStorage.getItem(URL_KEY)
})

async function copyShareUrl() {
  if (!shareUrl.value) return
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function uploadData() {
  const data = localStorage.getItem(DATA_KEY)
  if (!data) {
    errorMsg.value = 'No data found in storage.'
    uploadState.value = 'error'
    return
  }

  uploadState.value = 'loading'
  errorMsg.value = ''

  try {
    const form = new FormData()
    form.append('content', data)
    form.append('syntax', 'json')
    form.append('expiry_days', '365')

    const res = await fetch(DPASTE_API, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`dpaste returned ${res.status}`)

    const url = (await res.text()).trim()
    localStorage.setItem(URL_KEY, url)
    savedUrl.value = url
    uploadState.value = 'success'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Upload failed.'
    uploadState.value = 'error'
  }
}

async function restoreData() {
  if (!savedUrl.value) return

  restoreState.value = 'loading'
  errorMsg.value = ''

  try {
    const rawUrl = savedUrl.value.replace(/\/?$/, '.txt')
    const res = await fetch(rawUrl)
    if (!res.ok) throw new Error(`Fetch returned ${res.status}`)

    const text = await res.text()
    parseProtocols(text) // validates structure before saving
    localStorage.setItem(DATA_KEY, text)
    store.loadFromStorage()
    restoreState.value = 'success'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Restore failed.'
    restoreState.value = 'error'
  }
}
</script>

<template>
  <div class="settings">
    <header class="site-header">
      <div class="site-header-inner">
        <button class="back-btn" @click="router.replace('/')">
          <IconChevronLeft />
          Back
        </button>
        <span class="page-title">SETTINGS</span>
      </div>
    </header>

    <main class="main">
      <section class="section">
        <h2 class="section-title">Data</h2>

        <div class="card">
          <div class="card-row">
            <div class="card-info">
              <span class="card-label">Upload to dpaste</span>
              <span class="card-desc">Saves a copy of your timers to dpaste.com and stores the link.</span>
            </div>
            <button
              class="action-btn action-btn--primary"
              :disabled="uploadState === 'loading'"
              @click="uploadData"
            >
              {{ uploadState === 'loading' ? 'Uploading…' : 'Upload' }}
            </button>
          </div>

          <Transition name="fade">
            <div v-if="uploadState === 'success'" class="status status--ok">
              Uploaded successfully.
            </div>
          </Transition>
        </div>

        <div class="card">
          <div class="card-row">
            <div class="card-info">
              <span class="card-label">Restore from URL</span>
              <div v-if="savedUrl" class="url-row">
                <span class="card-url">{{ savedUrl }}</span>
                <button class="copy-btn" :class="{ 'copy-btn--ok': copied }" @click="copyShareUrl" :aria-label="copied ? 'Copied' : 'Copy share link'">
                  <IconCopy v-if="!copied" />
                  <IconCheck v-else />
                </button>
              </div>
              <span v-else class="card-desc card-desc--muted">No URL saved yet.</span>
            </div>
            <button
              class="action-btn action-btn--ghost"
              :disabled="!savedUrl || restoreState === 'loading'"
              @click="restoreData"
            >
              {{ restoreState === 'loading' ? 'Restoring…' : 'Restore' }}
            </button>
          </div>

          <Transition name="fade">
            <div v-if="restoreState === 'success'" class="status status--ok">
              Timers restored successfully.
            </div>
          </Transition>
        </div>

        <Transition name="fade">
          <div v-if="errorMsg" class="status status--err">{{ errorMsg }}</div>
        </Transition>
      </section>

      <section class="section" style="margin-top: 2rem">
        <h2 class="section-title">About</h2>
        <div class="card">
          <div class="card-row">
            <span class="card-label">Build</span>
            <span class="card-text-mono">{{ buildDate }} <span class="build-tz">{{ buildTz }}</span></span>
          </div>
          <div class="card-row">
            <span class="card-label">Commit</span>
            <span class="card-text-mono">{{ buildSha }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  gap: 0.3rem;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  transition: color 0.18s ease-out, transform 0.15s ease-out;
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

.back-btn:hover {
  color: var(--text);
}

.page-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--text);
}

/* Main */
.main {
  flex: 1;
  padding: 2rem 1.25rem;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

/* Section */
.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin: 0 0 0.375rem;
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.card-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
}

.card-desc {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.card-desc--muted {
  color: var(--text-muted);
}

.card-url {
  font-size: 0.72rem;
  color: var(--accent);
  word-break: break-all;
  font-family: 'IBM Plex Mono', monospace;
}

.url-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.copy-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--border-bright);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, transform 0.15s ease-out;
}

.copy-btn svg {
  width: 13px;
  height: 13px;
}

.copy-btn:hover {
  color: var(--text);
  border-color: var(--text-dim);
}

.copy-btn--ok {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

/* Buttons */
.action-btn {
  flex-shrink: 0;
  padding: 0.45rem 1.1rem;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.18s ease-out, color 0.18s ease-out, border-color 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
  border: 1px solid;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-btn--primary {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
}

.action-btn--primary:not(:disabled):hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.action-btn--ghost {
  background: transparent;
  color: var(--text-dim);
  border-color: var(--border-bright);
}

.action-btn--ghost:not(:disabled):hover {
  color: var(--text);
  border-color: var(--text-dim);
}

/* Status */
.status {
  font-size: 0.78rem;
  padding: 0.4rem 0.75rem;
  border-radius: 5px;
  letter-spacing: 0.02em;
}

.status--ok {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.status--err {
  background: color-mix(in srgb, var(--accent-red) 12%, transparent);
  color: var(--accent-red);
  border: 1px solid color-mix(in srgb, var(--accent-red) 25%, transparent);
}

.card-text-mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

.build-tz {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
