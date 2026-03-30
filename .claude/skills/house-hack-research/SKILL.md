---
name: house-hack-research
description: Estimate basement rental income for a house-hack property from a Zillow listing or address. Use when evaluating any listing in southwest Baltimore / Baltimore County (ZIP codes 21228, 21229, 21250, 21043, 21227) before running financial projections. Outputs conservative, base, and optimistic monthly rent figures for use as rA in house-hack-cli.
---

# House-Hack Rent Research

Use `research.md` as the knowledge base for all rent estimates. Do not estimate
from general knowledge — all figures must be grounded in the ZIP profiles,
comp table, and adjustment framework in that file.

## Process

1. Identify the ZIP code from the listing or address
2. Load `research.md` and locate the relevant ZIP profile
3. Apply the adjustment framework (bedrooms, entrance, kitchen, laundry, finish, parking)
4. Apply premiums, discounts, and red flags as appropriate
5. Output three figures:
   - **Conservative:** bottom 25–35% of band; use when details are incomplete or privacy is weak
   - **Base:** lower-middle of band; default for most listings
   - **Optimistic:** top 15–20% of band; only when private entry, full kitchen, dedicated parking, renovated finish

## Output Format

Return a short summary followed by:

| Scenario     | Monthly Rent | Key assumptions |
|--------------|-------------|-----------------|
| Conservative | $X          | ...             |
| Base         | $X          | ...             |
| Optimistic   | $X          | ...             |

Flag any red flags that should cap the estimate. Note which comps anchored
the figure. These map directly to `rA` in house-hack-cli.