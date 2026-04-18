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

Run a single test file:
```bash
pnpm test:unit src/components/__tests__/HelloWorld.spec.ts
```

`@` is aliased to `src/` throughout the codebase.

## Architecture

### Data model (`src/types/protocol.ts`)
A **Protocol** has metadata (name, description, sets, prepTime, restBetweenSets) plus an ordered array of **Intervals** (label + duration in seconds). No IDs on intervals — only Protocols have `id: string` (generated with `crypto.randomUUID()`).

Total workout duration formula:
```
prepTime + sets × Σ(interval.duration) + (sets − 1) × restBetweenSets
```

### State (`src/stores/protocols.ts`)
Single Pinia **setup store** (not Options API). `protocols` is a `ref<Protocol[]>` that is:
- Initialized from `localStorage` on first load, falling back to `defaultProtocols`
- Persisted automatically via `watch(..., { deep: true })`

Store actions: `addProtocol`, `removeProtocol`, `updateProtocol`, `resetToDefaults`.

### Routing
| Path | View | Purpose |
|---|---|---|
| `/` | `HomeView` | Protocol grid + create/edit form |
| `/timer/:id` | `TimerView` | Active timer for a protocol |

`TimerView` is lazy-loaded. It reads `:id` from the route and looks up the protocol from the store.

### Timer engine (`src/views/TimerView.vue`)
Uses **`requestAnimationFrame`** (not `setInterval`) for the countdown ring. Key variables:
- `phase`: `'prep' | 'interval' | 'rest' | 'complete'`
- `currentSet` (1-indexed), `currentIntervalIndex`, `elapsed` (ms)
- `phaseStart` (rAF timestamp when current phase began), `pausedAt` (ms elapsed when paused)

`tick()` computes `elapsed = pausedAt + (now − phaseStart)` and calls `advance()` when `elapsed >= currentPhaseDurationMs`. `advance()` transitions the phase state machine and queues the next rAF frame. `phaseStart = null` is the reset signal for a new phase.

**Audio** uses Web Audio API synth (no library). `initAudio()` must be called inside a user gesture (the START button) to unlock `AudioContext`. Sounds: countdown beep (last 3s of each phase), phase-change double-tone, workout-complete arpeggio.

**Confetti** is a canvas particle system (`confettiCanvas` ref) rendered independently of the timer rAF loop. Both rAF loops are cancelled in `onUnmounted`.

### Form (`src/components/ProtocolForm.vue`)
Supports create and edit modes via an optional `protocol?: Protocol` prop. When provided, form fields are pre-populated and `handleSave` preserves the existing `id`. The local `FormInterval` interface adds a `_uid` field (generated, never stored) to give each dynamic interval row a stable `v-for` key.

### Design system (`src/assets/`)
- `base.css` — minimal reset, removes number input spinners
- `main.css` — CSS custom properties (`--bg`, `--accent`, `--text`, etc.), dark theme, scrollbar styling
- Fonts loaded in `index.html`: **Barlow Condensed** (headings) + **IBM Plex Mono** (numbers/data)
- Interval accent colors are assigned by index from a fixed `COLORS` array shared between `ProtocolCard` and `TimerView`
