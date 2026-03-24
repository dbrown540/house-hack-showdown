# House-Hack Showdown v3.1

A React-based financial tool to compare the long-term wealth outcomes of different house-hacking strategies versus staying in the market (S&P 500).

## Features

- **Buy Cheap vs. Buy Better**: Compare two different property investment profiles.
- **Never Buy (S&P 500)**: Benchmark real estate against a pure stock market strategy.
- **Comprehensive Calc Engine**: Accounts for:
  - Mortgage PITI (Principal, Interest, Taxes, Insurance)
  - Upfront repairs and closing costs
  - Rental income with vacancy and maintenance reserves
  - Inflation on utilities, rent, and insurance
  - Home appreciation and mortgage paydown
  - Selling costs (commissions/fees)
  - Compounding returns on leftover day-1 capital and monthly surpluses

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd house-hack-showdown
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

Build the project for production:
```bash
npm run build
```

The optimized files will be in the `dist/` directory.

## Built With

- [React](https://reactjs.org/)
- [Vite](https://vite.dev/)
- [Outfit Font](https://fonts.google.com/specimen/Outfit)
- [JetBrains Mono Font](https://fonts.google.com/specimen/JetBrains+Mono)

## License

This project is open-source and available under the [MIT License](LICENSE).
