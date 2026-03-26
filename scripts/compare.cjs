#!/usr/bin/env node

/**
 * House-Hack Showdown v5 — CLI Runner
 *
 * Usage:
 *   node scripts/compare.cjs                                  # run with defaults
 *   node scripts/compare.cjs '{"pA": 280000, "rA": 1200}'    # override specific vars
 *   node scripts/compare.cjs < scenarios.json                 # pipe JSON file
 *   node scripts/compare.cjs '[{...}, {...}]'                 # batch mode (array)
 *
 * Pass --yearly to include year-by-year data in output.
 * Pass --compact for single-line JSON output per scenario.
 */

const { compare } = require("./engine.cjs");
const defaults = require("./defaults.json");

const includeYearly = process.argv.includes("--yearly");
const compact = process.argv.includes("--compact");

function run(overrides) {
  const params = { ...defaults, ...overrides };
  const result = compare(params);

  if (!includeYearly) {
    delete result.houseHack.yearlyData;
    delete result.neverBuy.yearlyData;
  }

  return { params: overrides, result };
}

function formatOutput(output) {
  if (compact) return JSON.stringify(output);
  return JSON.stringify(output, null, 2);
}

async function main() {
  // Collect input from arg or stdin
  let input = null;

  // Check for JSON arg (skip flags)
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (args.length > 0) {
    input = args[0];
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    input = Buffer.concat(chunks).toString().trim();
  }

  if (!input) {
    // No input — run with all defaults
    const output = run({});
    console.log(formatOutput(output));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    console.error("Error: Invalid JSON input");
    console.error(e.message);
    process.exit(1);
  }

  if (Array.isArray(parsed)) {
    // Batch mode
    const results = parsed.map((overrides, i) => {
      const output = run(overrides);
      return { scenario: i + 1, ...output };
    });
    console.log(formatOutput(results));

    // Print summary table to stderr
    console.error("\n  #  Winner             Hold NW       Liq NW     Margin");
    console.error("  —  ———————————————    —————————     ————————    ————————");
    results.forEach((r) => {
      const w = r.result.winner.padEnd(17);
      const hold = `$${r.result.houseHack.totalWealth.toLocaleString()}`.padStart(12);
      const liq = `$${r.result.houseHack.totalWealthLiq.toLocaleString()}`.padStart(12);
      const margin = `$${r.result.margin.toLocaleString()}`.padStart(10);
      console.error(`  ${String(r.scenario).padStart(1)}  ${w}  ${hold}   ${liq}  ${margin}`);
    });
    console.error("");
  } else {
    // Single scenario
    const output = run(parsed);
    console.log(formatOutput(output));
  }
}

main();
