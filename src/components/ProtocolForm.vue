<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Protocol } from '@/types/protocol'

const props = defineProps<{ protocol?: Protocol }>()
const emit = defineEmits<{
  save: [protocol: Protocol]
  cancel: []
}>()

const isEditing = computed(() => !!props.protocol)

interface FormInterval {
  _uid: string
  label: string
  duration: number
}

const form = reactive({
  name: props.protocol?.name ?? '',
  description: props.protocol?.description ?? '',
  sets: props.protocol?.sets ?? 8,
  prepTime: props.protocol?.prepTime ?? 10,
  restBetweenSets: props.protocol?.restBetweenSets ?? 10,
  intervals: (props.protocol?.intervals.map((i) => ({ _uid: crypto.randomUUID(), ...i })) ??
    [{ _uid: crypto.randomUUID(), label: '', duration: 20 }]) as FormInterval[],
})

const isValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.sets > 0 &&
    form.intervals.length > 0 &&
    form.intervals.every((i) => i.label.trim().length > 0 && i.duration > 0),
)

function addInterval() {
  form.intervals.push({ _uid: crypto.randomUUID(), label: '', duration: 30 })
}

function removeInterval(uid: string) {
  const index = form.intervals.findIndex((i) => i._uid === uid)
  if (index !== -1) form.intervals.splice(index, 1)
}

function handleSave() {
  if (!isValid.value) return
  const protocol: Protocol = {
    id: props.protocol?.id ?? crypto.randomUUID(),
    name: form.name.trim(),
    description: form.description.trim(),
    sets: form.sets,
    prepTime: form.prepTime,
    restBetweenSets: form.restBetweenSets,
    intervals: form.intervals.map(({ label, duration }) => ({ label: label.trim(), duration })),
  }
  emit('save', protocol)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('cancel')">
    <div class="modal-sheet" role="dialog" aria-modal="true" :aria-label="isEditing ? 'Edit timer' : 'New timer'">
      <div class="sheet-handle" />

      <div class="sheet-header">
        <h2 class="sheet-title">{{ isEditing ? 'Edit Timer' : 'New Timer' }}</h2>
        <button class="sheet-close" @click="emit('cancel')" aria-label="Close">×</button>
      </div>

      <div class="sheet-body">
        <section class="form-section">
          <h3 class="form-section-label">Protocol Info</h3>

          <div class="field">
            <label class="field-label" for="f-name">Name</label>
            <input
              id="f-name"
              v-model="form.name"
              class="field-input"
              type="text"
              placeholder="e.g. My HIIT Routine"
              autocomplete="off"
            />
          </div>

          <div class="field">
            <label class="field-label" for="f-desc">Description</label>
            <input
              id="f-desc"
              v-model="form.description"
              class="field-input"
              type="text"
              placeholder="Short description (optional)"
              autocomplete="off"
            />
          </div>

          <div class="field-row">
            <div class="field field--sm">
              <label class="field-label" for="f-sets">Sets</label>
              <input
                id="f-sets"
                v-model.number="form.sets"
                class="field-input field-input--mono"
                type="number"
                min="1"
                max="99"
              />
            </div>
            <div class="field field--sm">
              <label class="field-label" for="f-prep">Prep (s)</label>
              <input
                id="f-prep"
                v-model.number="form.prepTime"
                class="field-input field-input--mono"
                type="number"
                min="0"
              />
            </div>
            <div class="field field--sm">
              <label class="field-label" for="f-rest">Rest (s)</label>
              <input
                id="f-rest"
                v-model.number="form.restBetweenSets"
                class="field-input field-input--mono"
                type="number"
                min="0"
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-label">Intervals</h3>

          <TransitionGroup name="interval" tag="div" class="interval-list">
            <div v-for="interval in form.intervals" :key="interval._uid" class="interval-row">
              <input
                v-model="interval.label"
                class="field-input interval-label"
                type="text"
                placeholder="Label"
                autocomplete="off"
              />
              <input
                v-model.number="interval.duration"
                class="field-input field-input--mono interval-duration"
                type="number"
                min="1"
                placeholder="s"
              />
              <button
                class="interval-remove"
                :disabled="form.intervals.length === 1"
                @click="removeInterval(interval._uid)"
                aria-label="Remove interval"
              >
                ×
              </button>
            </div>
          </TransitionGroup>

          <button class="btn-add-interval" @click="addInterval">+ Add interval</button>
        </section>
      </div>

      <div class="sheet-footer">
        <button class="btn btn--ghost" @click="emit('cancel')">Cancel</button>
        <button class="btn btn--primary" :disabled="!isValid" @click="handleSave">
          {{ isEditing ? 'Update Timer' : 'Save Timer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
  }
}

.modal-sheet {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: var(--bg-sheet);
  border: 1px solid var(--border-bright);
  border-bottom: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 640px) {
  .modal-sheet {
    border: 1px solid var(--border-bright);
    max-height: 85vh;
  }
}

.sheet-handle {
  width: 36px;
  height: 3px;
  background: var(--border-bright);
  border-radius: 2px;
  margin: 0.75rem auto 0;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .sheet-handle {
    display: none;
  }
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sheet-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  margin: 0;
}

.sheet-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
  transition: color 0.15s;
}

.sheet-close:hover {
  color: var(--text);
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overscroll-behavior: contain;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--accent);
  text-transform: uppercase;
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field--sm {
  flex: 1;
}

.field-row {
  display: flex;
  gap: 0.75rem;
}

.field-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.field-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  -webkit-appearance: none;
}

.field-input::placeholder {
  color: var(--text-muted);
}

.field-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 10%, transparent);
}

.field-input--mono {
  font-family: 'IBM Plex Mono', monospace;
}

/* Interval list */
.interval-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.interval-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.interval-label {
  flex: 1;
}

.interval-duration {
  width: 5rem;
  flex-shrink: 0;
  text-align: center;
}

.interval-remove {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
  line-height: 1;
}

.interval-remove:hover:not(:disabled) {
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.interval-remove:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.btn-add-interval {
  background: transparent;
  border: 1px dashed var(--border-bright);
  color: var(--text-dim);
  padding: 0.6rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  width: 100%;
  transition: border-color 0.15s, color 0.15s;
  text-align: center;
}

.btn-add-interval:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Footer */
.sheet-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 0.8rem 1rem;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.btn--ghost {
  background: transparent;
  border-color: var(--border-bright);
  color: var(--text-dim);
}

.btn--ghost:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-on);
  font-weight: 800;
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.btn--primary:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Interval transition animations */
.interval-enter-active,
.interval-leave-active {
  transition: all 0.2s ease;
}

.interval-enter-from,
.interval-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
