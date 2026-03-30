---
name: house-hack-research
description: estimate rental income for a house-hack property from a zillow listing, address, or zip code. use when evaluating a listing and you have markdown market files organized by zip code, such as 20743.md or a shared file like "21228, 21229, 21250, 21043, 21227".md. first look for a markdown file named exactly after the target zip code. if no exact zip file exists, fall back to a shared markdown file that explicitly includes that zip code in its filename. output conservative, base, and optimistic monthly rent figures for use in underwriting or as rA in house-hack-cli.
---

# House-Hack Rent Research

Use the markdown knowledge base files in the skill folder for all rent estimates. Do not estimate from general knowledge. Ground all figures in the matching ZIP markdown file when available, otherwise use the shared markdown file that covers the ZIP.

## Knowledge-base file selection

1. Identify the target ZIP code from the listing, address, or user prompt.
2. Search for a markdown file named exactly:
   - `<zip>.md`
   - example: `20743.md`
3. If an exact ZIP markdown exists, use that file as the primary knowledge base.
4. If no exact ZIP markdown exists, search for a shared markdown file whose filename explicitly contains the ZIP code.
   - example: `"21228, 21229, 21250, 21043, 21227".md`
5. If both exist:
   - use the exact ZIP markdown as primary
   - use the shared markdown only as supporting context if needed
6. If no matching markdown file is found, say that the ZIP-specific knowledge base is missing and do not invent rent figures.

## Process

1. Identify the ZIP code from the listing or address.
2. Load the matching markdown file using the file-selection rules above.
3. Locate the relevant ZIP profile, rent anchors, comps, and adjustment framework in that file.
4. Apply the adjustment framework:
   - bedrooms
   - bathrooms
   - entrance / privacy
   - kitchen quality
   - laundry
   - finish quality
   - parking
   - metro proximity
   - utilities
5. Apply premiums, discounts, and red flags as appropriate.
6. Output three figures:
   - **Conservative:** bottom 25–35% of band; use when details are incomplete or privacy is weak
   - **Base:** lower-middle of band; default for most listings
   - **Optimistic:** top 15–20% of band; only when private entry, full kitchen, dedicated parking, renovated finish
7. State which markdown file was used.
8. Note which specific comps or anchor rules from that file drove the estimate.

## Output Format

Return a short summary followed by:

| Scenario     | Monthly Rent | Key assumptions |
|--------------|-------------|-----------------|
| Conservative | $X          | ...             |
| Base         | $X          | ...             |
| Optimistic   | $X          | ...             |

Then add:

- **Knowledge base used:** `<filename>.md`
- **Key anchors used:** list the most relevant comps, baseline ranges, or adjustment rules
- **Red flags:** any issues that should cap the estimate

## File-selection examples

### Example 1: exact ZIP file exists
- Input address is in **20743**
- Files available:
  - `20743.md`
  - `"21228, 21229, 21250, 21043, 21227".md`
- Use: `20743.md`

### Example 2: only shared file exists
- Input ZIP is **21228**
- Files available:
  - `"21228, 21229, 21250, 21043, 21227".md`
- Use: `"21228, 21229, 21250, 21043, 21227".md`

### Example 3: no matching file
- Input ZIP is **21060**
- Files available:
  - `20743.md`
  - `"21228, 21229, 21250, 21043, 21227".md`
- Result:
  - explain that no ZIP-specific or shared markdown file covering 21060 was found
  - do not estimate rent from memory or generic market knowledge

## Guardrails

- Prefer exact ZIP markdown over shared market files.
- Never mix market logic across unrelated ZIPs unless the markdown explicitly says to do so.
- Do not use general web knowledge when the skill’s markdown files are missing or incomplete.
- If listing details are ambiguous, stay conservative and say what assumption you made.
- Treat the markdown file as the source of truth for all numeric anchors.