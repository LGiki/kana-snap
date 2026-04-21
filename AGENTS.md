# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the application code. Route entry points live in `src/routes`, shared UI in `src/components`, persistent state in `src/stores`, reusable logic in `src/lib` and `src/utils`, and static datasets in `src/data`. Internationalization setup is in `src/i18n`. Public runtime assets such as icons, the handwriting model, and stroke SVG data live under `public/`. Production output is generated into `dist/` and should not be edited manually. Model-training utilities are isolated in `scripts/train-kana-model/`.

## Build, Test, and Development Commands
Use Bun for day-to-day work:

- `bun install` installs dependencies.
- `bun dev` starts Vite on `http://localhost:3000`.
- `bun run build` creates the production bundle in `dist/`.
- `bun run preview` serves the built app locally.
- `bun run test` runs Vitest in `jsdom`.
- `bun run check` runs Biome formatting and lint checks.
- `bun run lint` or `bun run format` runs each step separately.

## Coding Style & Naming Conventions
This repo uses TypeScript, React 19, and Biome. Follow Biome defaults plus the checked-in config: tabs for indentation, double quotes, and organized imports. Prefer PascalCase for React components (`KanaChart.tsx`), `useX` for hooks (`useAppStore.ts`), and descriptive camelCase for utilities. Keep tests and small helpers next to the code they cover. Do not hand-edit generated files such as `src/routeTree.gen.ts`. For components that need refs, use React 19's `ref` prop pattern with `ComponentProps<"button">` or explicit `ref?: React.Ref<T>` props instead of adding new `forwardRef` wrappers.

## UI, State & Localization Patterns
User-facing text should go through `react-i18next`; when adding or renaming keys, update all locale files in `src/i18n/locales` (`en`, `ja`, `zh-CN`, and `zh-TW`) in the same change. Persisted app preferences live in `src/stores/useAppStore.ts`; add new preference fields to `initialState`, export/import handling, persist `merge` validation, and nearby store tests. Kana glyphs should opt into the user-selected font with the `.font-kana` utility, and mixed strings should use `hasKana` from `src/lib/kanaFonts.ts` when the font should apply only if kana are present.

## Responsive & Print Behavior
Treat mobile and narrow layouts as first-class. Prefer responsive Tailwind classes, `min-w-0`, `shrink-0`, wrapping, and safe-area `env()` spacing for fixed or bottom navigation UI so labels and controls do not overflow. The kana chart has dedicated print selectors in `src/styles.css` using `app-*` and `kana-chart__*` classes; preserve those hooks when changing chart, navigation, or update-prompt markup, and verify printing behavior for chart changes.

## Testing Guidelines
Vitest and Testing Library are the active test stack. Place tests beside implementation files with `*.test.ts` or `*.test.tsx` names, as in `src/utils/quiz.test.ts`. Cover new store logic, utility behavior, and interaction-heavy UI changes. Run `bun run test` before opening a PR; run `bun run check` for style and lint validation.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes like `feat:`, `fix:`, `refactor:`, `docs:`, and `chore:`. Keep commit subjects imperative and specific, for example `fix: guard quiz reset during route change`. PRs should summarize user-facing changes, note testing performed, link related issues, and include screenshots or short recordings for UI updates on routes such as `/quiz` or `/learn`.

## Assets & Configuration Tips
Treat `public/model/` and `public/strokesvg/` as source assets consumed by the app. If you update the handwriting model or training pipeline, document the change in `scripts/train-kana-model/README.md` and verify the built app still loads those assets correctly.
