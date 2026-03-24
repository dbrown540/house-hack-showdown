# House-Hack Showdown v3.1 - Project Context

## Project Overview
House-Hack Showdown is a React-based financial tool designed to compare the long-term wealth outcomes of different real estate investment strategies ("house-hacking") against a pure stock market investment (S&P 500). It provides a detailed comparison between buying a cheaper property, buying a "better" property, and renting while investing all capital in the market.

### Key Technologies
- **Frontend:** React 19 (Hooks: `useState`, `useMemo`)
- **Build Tool:** Vite 6
- **Styling:** Vanilla CSS (primarily inline styles within JSX)
- **Fonts:** Outfit, JetBrains Mono (loaded via Google Fonts)

### Architecture
- **`src/App.jsx`**: The core of the application. It manages the global state for all assumptions (mortgage rates, inflation, property prices, etc.), contains the calculation engines for both house-hacking and renting scenarios, and defines the primary UI layout.
- **`src/components/`**:
  - **`Slider.jsx`**: A reusable input component for adjusting financial variables.
  - **`Row3.jsx`**: A specialized table row component used to compare metrics across the three scenarios (Option A, B, and C).
- **`src/utils/`**:
  - **`math.js`**: Financial utility functions including mortgage payment calculations (`pmt`), wealth gap analysis, and currency formatting.
  - **`constants.js`**: Centralized UI constants such as theme colors and background opacity helpers.

---

## Building and Running

### Development
To start the development server with hot-module replacement:
```bash
npm run dev
```

### Production
To create an optimized production build:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## Development Conventions

### Coding Style
- **Components**: Functional components using React Hooks.
- **State Management**: Local component state (`useState`) is used for user inputs, while complex financial calculations are wrapped in `useMemo` for performance.
- **Styling**: Inline styles are preferred for component-specific layout and theming, utilizing CSS variables defined at the root for consistent typography.
- **Naming**: Use PascalCase for components (e.g., `Slider`) and camelCase for functions, variables, and props.

### Financial Logic
- **Calculation Engine**: The logic in `src/App.jsx` (specifically `calcBuy` and `calcNeverBuy`) is the "source of truth" for the tool's financial modeling. It accounts for:
  - Mortgage PITI, inflation (utilities, rent, tax), and maintenance/vacancy.
  - Compounding returns on both day-1 leftover capital and monthly surpluses.
  - Home appreciation and net equity after selling costs.
- **Formatting**: Always use the `fmt` utility from `src/utils/math.js` for currency display to ensure consistency.

### Testing & Validation
- Currently, the project relies on manual verification of the UI and calculation outputs. When modifying financial logic, ensure you cross-reference the "Verdict" and "Insights" sections to maintain logical consistency.
