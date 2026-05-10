<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import IconDownload from '@/icons/IconDownload.vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isIOS = ref(false)
const isInstalled = ref(false)
const dismissed = ref(false)

function onBeforeInstall(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
}

function onAppInstalled() {
  isInstalled.value = true
  deferredPrompt.value = null
}

async function install() {
  if (!deferredPrompt.value) return
  await deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') isInstalled.value = true
  deferredPrompt.value = null
}

onMounted(() => {
  const ua = navigator.userAgent
  isIOS.value = /iphone|ipad|ipod/i.test(ua) && !('MSStream' in window)

  // Already installed as standalone
  if (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone)) {
    isInstalled.value = true
    return
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="!isInstalled && !dismissed && (deferredPrompt || isIOS)"
      class="install-banner"
    >
      <div class="install-content">
        <IconDownload class="install-icon" />
        <div class="install-text">
          <span class="install-title">Install app</span>
          <span v-if="isIOS" class="install-hint">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </span>
          <span v-else class="install-hint">Use it offline, no browser needed</span>
        </div>
      </div>
      <div class="install-actions">
        <button v-if="!isIOS" class="btn-install" @click="install">Install</button>
        <button class="btn-dismiss" @click="dismissed = true" aria-label="Dismiss">✕</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-banner {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  translate: -50% 0;
  width: min(calc(100vw - 2rem), 420px);
  background: var(--bg-card);
  border: 1px solid var(--border-bright);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.install-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.install-icon {
  font-size: 1.25rem;
  color: var(--text);
  flex-shrink: 0;
}

.install-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.install-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
  letter-spacing: 0.03em;
}

.install-hint {
  font-size: 0.75rem;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.install-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-install {
  background: var(--accent);
  color: var(--accent-on);
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-install:hover {
  background: var(--accent-hover);
}

.btn-dismiss {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}

.btn-dismiss:hover {
  color: var(--text-dim);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  translate: -50% 1rem;
}
</style>
