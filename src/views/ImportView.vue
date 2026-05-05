<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProtocolsStore } from '@/stores/protocols'

const DATA_KEY = 'interval-timer-data'

const route = useRoute()
const router = useRouter()
const store = useProtocolsStore()

const status = ref<'loading' | 'error'>('loading')
const errorMsg = ref('')

onMounted(async () => {
  const id = route.query.id as string | undefined
  if (!id) {
    errorMsg.value = 'No import ID provided.'
    status.value = 'error'
    return
  }

  try {
    const res = await fetch(`https://dpaste.com/${id}.txt`)
    if (!res.ok) throw new Error(`Could not fetch paste (${res.status})`)

    const text = await res.text()
    JSON.parse(text) // validate
    localStorage.setItem(DATA_KEY, text)
    store.loadFromStorage()
    router.replace('/')
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Import failed.'
    status.value = 'error'
  }
})
</script>

<template>
  <div class="import-page">
    <div v-if="status === 'loading'" class="state">
      <span class="spinner">◎</span>
      <p class="state-text">Importing timers…</p>
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
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
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
  transition: color 0.15s, border-color 0.15s;
}

.back-btn:hover {
  color: var(--text);
  border-color: var(--text-dim);
}
</style>
