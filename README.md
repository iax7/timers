# Interval Timer

A responsive PWA for building and running custom workout interval protocols. Installable on Android, iOS, and macOS. Built with Vue 3, TypeScript, and Pinia.

## Features

- Create and manage custom workout protocols with multiple intervals per set
- Visual countdown ring with phase-aware color coding
- Prep time, configurable sets, and rest periods between sets
- Audio cues — countdown beeps for the last 3 seconds of each phase, distinct tone on phase change
- Confetti celebration on workout completion
- Screen wake lock while the timer is running (prevents display sleep on mobile)
- Protocols persisted to `localStorage`
- **PWA** — installable on Android, iOS, and macOS; works offline
- **Data sync** — upload protocols to [dpaste.com](https://dpaste.com) and restore via shareable import link

## Tech Stack

- [Vue 3](https://vuejs.org/) with `<script setup>` Composition API
- [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.vuejs.org/) for state management
- [Vue Router](https://router.vuejs.org/)
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev          # dev server with HMR
pnpm build        # type-check + production build
pnpm type-check   # vue-tsc only
pnpm lint         # oxlint + eslint with auto-fix
pnpm test:unit    # Vitest
```

## License

MIT
