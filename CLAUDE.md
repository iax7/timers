# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server with HMR (Vite)
pnpm build        # type-check + production build
pnpm type-check   # vue-tsc only, no emit — fastest correctness check
pnpm lint         # oxlint + eslint with auto-fix
pnpm test:unit    # Vitest
```

`@` is aliased to `src/` throughout the codebase.

## Architecture

### Data model (`src/types/protocol.ts`)

A **Protocol** has metadata (name, description, sets, prepTime, restBetweenSets) plus an ordered array of **Intervals** (label + duration in seconds). No IDs on intervals — only Protocols have `id: string` (generated with `crypto.randomUUID()`).

Total workout duration formula:

```text
prepTime + sets × Σ(interval.duration) + (sets − 1) × restBetweenSets
```

### State (`src/stores/protocols.ts`)

Single Pinia **setup store** (not Options API). `protocols` is a `ref<Protocol[]>` that is:

- Initialized from `localStorage` on first load (key: `interval-timer-data`), falling back to `defaultProtocols`
- Persisted automatically via `watch(..., { deep: true })` with try/catch for quota errors
- `parseProtocols(json)` is exported for schema validation before writing to storage — used by SettingsView and ImportView

Store actions: `addProtocol`, `removeProtocol`, `updateProtocol`, `resetToDefaults`, `loadFromStorage`.

### Routing

| Path | View | Purpose |
| --- | --- | --- |
| `/` | `HomeView` | Protocol grid + create/edit form |
| `/timer/:id` | `TimerView` | Active timer for a protocol |
| `/settings` | `SettingsView` | Data sync + build info |
| `/import?id=X` | `ImportView` | Auto-restore from paste ID |

`TimerView`, `SettingsView`, and `ImportView` are lazy-loaded. All back navigation uses `router.push('/')` (not `router.back()`) so direct URL access always returns home.

### Timer engine (`src/views/TimerView.vue`)

Uses **`requestAnimationFrame`** (not `setInterval`) for the countdown ring. Key variables:

- `phase`: `'prep' | 'interval' | 'rest' | 'complete'`
- `currentSet` (1-indexed), `currentIntervalIndex`, `elapsed` (ms)
- `phaseStart` (rAF timestamp when current phase began), `pausedAt` (ms elapsed when paused)

`tick()` computes `elapsed = pausedAt + (now − phaseStart)` and calls `advance()` when `elapsed >= currentPhaseDurationMs`. `advance()` transitions the phase state machine and queues the next rAF frame. `phaseStart = null` is the reset signal for a new phase.

**Audio** uses Web Audio API synth (no library). `initAudio()` must be called inside a user gesture (the START button) to unlock `AudioContext`. Sounds: countdown beep (last 3s of each phase), phase-change double-tone, workout-complete arpeggio.

**Confetti** is a canvas particle system (`confettiCanvas` ref) rendered independently of the timer rAF loop. Both rAF loops are cancelled in `onUnmounted`.

**Wake lock** (`navigator.wakeLock`) is acquired on start/resume and released on pause/complete/unmount. Re-acquired on visibility change if the timer is still running.

### Form (`src/components/ProtocolForm.vue`)

Supports create and edit modes via an optional `protocol?: Protocol` prop. When provided, form fields are pre-populated and `handleSave` preserves the existing `id`. A `watch(() => props.protocol, ...)` resets the form when switching between protocols in edit mode. The local `FormInterval` interface adds a `_uid` field (generated, never stored) to give each dynamic interval row a stable `v-for` key.

### Data sync (`src/views/SettingsView.vue`)

- **Upload**: POSTs `interval-timer-data` to `https://dpaste.com/api/v2/`, saves returned URL to `interval-timer-data-url`
- **Restore**: fetches `{url}.txt`, runs `parseProtocols()` for validation, writes to storage, calls `loadFromStorage()`
- **Share link**: copy button generates `{origin}#/import?id={pasteId}` — opening this URL triggers `ImportView` which auto-restores and redirects to `/`

### PWA (`vite.config.ts`)

Configured via `vite-plugin-pwa` (Workbox, `generateSW` mode). `start_url` and `scope` in the manifest use the same `base` variable as Vite so GitHub Pages deployment (`/timers/`) is correctly scoped. Build date and timezone are injected at compile time via `define` as `__BUILD_DATE__` and `__BUILD_TZ__` (declared in `env.d.ts`).

### Design system (`src/assets/`)

- `base.css` — minimal reset, removes number input spinners, global `button:active:not(:disabled) { transform: scale(0.96) }`
- `main.css` — CSS custom properties (`--bg`, `--accent`, `--text`, etc.), dark theme, scrollbar styling
- Fonts loaded in `index.html`: **Barlow Condensed** (headings) + **IBM Plex Mono** (numbers/data)
- Interval accent colors are assigned by index from a fixed `COLORS` array shared between `ProtocolCard` and `TimerView`
- Button transitions use `0.18s ease-out` with `transform` included; primary buttons add a `box-shadow` glow on hover
