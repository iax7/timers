<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProtocolsStore } from '@/stores/protocols'
import ProtocolCard from '@/components/ProtocolCard.vue'
import ProtocolForm from '@/components/ProtocolForm.vue'
import IconSettings from '@/icons/IconSettings.vue'
import IconPlus from '@/icons/IconPlus.vue'
import type { Protocol } from '@/types/protocol'

const router = useRouter()
const store = useProtocolsStore()
const showForm = ref(false)
const editingProtocol = ref<Protocol | null>(null)

const protocols = computed(() => store.protocols)

function handleSave(protocol: Protocol) {
  if (editingProtocol.value) {
    store.updateProtocol(editingProtocol.value.id, protocol)
  } else {
    store.addProtocol(protocol)
  }
  showForm.value = false
  editingProtocol.value = null
}

function handleCancel() {
  showForm.value = false
  editingProtocol.value = null
}

function handleEdit(protocol: Protocol) {
  editingProtocol.value = protocol
  showForm.value = true
}

function handleDelete(id: string) {
  store.removeProtocol(id)
}

function handleSelect(id: string) {
  router.replace(`/timer/${id}`)
}
</script>

<template>
  <div class="home">
    <header class="site-header">
      <div class="site-header-inner">
        <div class="site-logo">
          <span class="site-logo-icon">◎</span>
          <span class="site-logo-text">INTERVAL<span class="site-logo-accent">TIMER</span></span>
        </div>
        <div class="header-actions">
          <button class="header-btn header-btn--ghost" @click="router.replace('/settings')" aria-label="Settings">
            <IconSettings />
          </button>
          <button class="header-btn header-btn--new-timer" @click="showForm = true">
            <IconPlus />
            New Timer
          </button>
        </div>
      </div>
    </header>

    <main class="main">
      <div v-if="protocols.length === 0" class="empty-state">
        <div class="empty-icon">◎</div>
        <h2 class="empty-title">No timers yet</h2>
        <p class="empty-desc">Create your first workout timer or restore the built-in protocols.</p>
        <div class="empty-actions">
          <button class="btn-empty btn-empty--primary" @click="showForm = true">+ Create Timer</button>
          <button class="btn-empty btn-empty--ghost" @click="store.resetToDefaults()">↺ Reload defaults</button>
        </div>
      </div>

      <div v-else class="protocol-grid">
        <ProtocolCard
          @edit="handleEdit"
          v-for="protocol in protocols"
          :key="protocol.id"
          :protocol="protocol"
          @delete="handleDelete"
          @select="handleSelect(protocol.id)"
        />
      </div>
    </main>

    <button class="fab" @click="showForm = true" aria-label="Add timer">+</button>

    <Transition name="modal">
      <ProtocolForm
        v-if="showForm"
        :protocol="editingProtocol ?? undefined"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </Transition>
  </div>
</template>

<style scoped>
.home {
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
  z-index: 10;
  backdrop-filter: blur(8px);
}

.site-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 3.5rem;
}

.site-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.site-logo-icon {
  font-size: 1.4rem;
  color: var(--accent);
  line-height: 1;
}

.site-logo-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--text);
}

.site-logo-accent {
  color: var(--accent);
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--accent);
  border: none;
  color: var(--accent-on);
  padding: 0.45rem 1rem;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
}

.header-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.header-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.header-btn--ghost {
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
  padding: 0.4rem;
}

.header-btn--ghost svg {
  width: 16px;
  height: 16px;
}

.header-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--text);
  border-color: var(--text-dim);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-btn--new-timer {
  display: none;
}

@media (min-width: 640px) {
  .header-btn--new-timer {
    display: flex;
  }
}

/* Main */
.main {
  flex: 1;
  padding: 1.5rem 1.25rem 6rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* Grid */
.protocol-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .protocol-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .protocol-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 1rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--border-bright);
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.empty-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text);
  text-transform: uppercase;
  margin: 0;
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: center;
  margin-top: 0.5rem;
}

@media (min-width: 400px) {
  .empty-actions {
    flex-direction: row;
  }
}

.btn-empty {
  padding: 0.7rem 1.5rem;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  border: 1px solid;
  transition: background 0.18s ease-out, color 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.15s ease-out;
  background: transparent;
}

.btn-empty--primary {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-empty--primary:hover {
  background: var(--accent);
  color: var(--accent-on);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.btn-empty--ghost {
  border-color: var(--border-bright);
  color: var(--text-dim);
}

.btn-empty--ghost:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

/* FAB */
.fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3.25rem;
  height: 3.25rem;
  background: var(--accent);
  border: none;
  border-radius: 50%;
  color: var(--accent-on);
  font-size: 1.75rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
  transition: transform 0.18s ease-out, box-shadow 0.18s ease-out;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab:hover {
  transform: scale(1.08);
  box-shadow: 0 0 30px color-mix(in srgb, var(--accent) 60%, transparent);
}

@media (min-width: 640px) {
  .fab {
    display: none;
  }
}

/* Modal transition */
.modal-enter-active {
  transition: opacity 0.25s ease;
}
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
