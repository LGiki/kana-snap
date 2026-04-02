# KanaSnap

Interactive Japanese Kana (Hiragana & Katakana) learning PWA with charts, quizzes, and analytics.

## Features

- **Kana Chart** — Browse all gojuon, dakuten, handakuten, and yoon kana with hiragana, katakana, and comparison display modes
- **Quiz** — Weighted quiz engine that prioritizes frequently-missed kana, with keyboard shortcuts and auto-advance
- **Learn** — Infinite scroll kana feed with streak milestones and embedded pop quizzes
- **Analytics** — GitHub-style contribution heatmap, line charts, streak counters, and average scores
- **PWA** — Installable, works offline with service worker caching
- **i18n** — English, Japanese, Simplified Chinese, Traditional Chinese
- **Theming** — Light/dark/auto with 8 color scheme palettes

## Getting Started

```bash
bun install
bun dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `bun dev`          | Start dev server on port 3000    |
| `bun run build`    | Production build (outputs to `dist/`) |
| `bun run preview`  | Preview production build         |
| `bun run test`     | Run tests with Vitest            |
| `bun run check`    | Run Biome lint + format check    |
| `bun run lint`     | Lint only                        |
| `bun run format`   | Format only                      |

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 19 + Vite 7
- **Routing**: TanStack Router (file-based)
- **Styling**: TailwindCSS v4
- **State**: Zustand with localStorage persistence
- **i18n**: i18next + react-i18next
- **PWA**: vite-plugin-pwa with Workbox

## License

Private project.
