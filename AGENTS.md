# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React single-page app.

- `src/App.jsx`: main UI and financial calculation engine (`calcBuy`, `calcNeverBuy`).
- `src/components/`: reusable UI pieces (`Slider.jsx`, `Row3.jsx`).
- `src/utils/`: shared logic and constants (`math.js`, `constants.js`).
- `index.html`: app shell.
- `vite.config.js`: Vite config (`base: '/house-hack-showdown/'` for GitHub Pages).
- `dist/`: production build output (generated).

Keep new shared logic in `src/utils/` and avoid growing `App.jsx` further unless the change is tightly coupled to page state.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local dev server at `http://localhost:5173`.
- `npm run build`: create production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.

There is currently no automated test script in `package.json`.

## Coding Style & Naming Conventions
- Use functional React components and hooks (`useState`, `useMemo`).
- Component files and component names: PascalCase (example: `Slider.jsx`, `Row3`).
- Variables, functions, props: camelCase (example: `phase2RentGrowth`).
- Match existing style: inline JSX styles and double-quoted strings in source files.
- For money display, use `fmt()` from `src/utils/math.js` instead of ad-hoc formatting.

## Testing Guidelines
Automated tests are not configured yet. Validate changes with:
1. `npm run dev`
2. Manual checks of calculator outputs and comparison rows
3. Regression checks in Verdict/Insights behavior after logic changes

If you add tests, place them near the feature (`src/**`) and add a script in `package.json`.

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit messages (example: `Added graphs`, `Improved accuracy`).

- Keep commit subjects brief and action-oriented.
- One logical change per commit when possible.
- PRs should include:
  - Clear summary of user-visible and calculation-logic changes
  - Linked issue (if applicable)
  - Before/after screenshots for UI updates
  - Manual verification notes (what scenarios you tested)
