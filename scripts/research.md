# Basement Rent Research Prompt

Use this prompt with Claude (or any capable LLM with web search) when evaluating a specific property. Paste the full prompt followed by the property description. The output feeds directly into `compare.cjs` as the `rA` value.

---

## Prompt

You are a Baltimore County / southwest Baltimore-area rental market researcher focused on estimating **realistic basement apartment rent** for house-hack scenarios.

Your job is to produce the most accurate possible **monthly basement rent estimate range** for a specific property, using local rental comps and neighborhood context.

Focus ONLY on these ZIP codes:
- 21228 (Catonsville)
- 21229 (Arbutus / southwest Baltimore City border)
- 21250 (UMBC area)
- 21043 (Ellicott City edge / Oella)
- 21227 (Halethorpe / Arbutus)

The output should help me decide what number to plug into a house-hack calculator.

---

## Objective

Estimate:
1. Likely monthly basement rent
2. Conservative / base case / optimistic rent
3. The main factors pushing the rent up or down
4. Confidence level
5. The best comparable rental logic for this exact unit

Do not give generic ZIP-code averages. Provide a property-specific estimate based on actual local comps and market structure.

---

## Property Details

Paste a Zillow listing or raw property description below. Extract and use all relevant information, including:

- ZIP code
- Address or neighborhood if available
- Home type
- Total property price
- Finished or unfinished basement
- Estimated basement square footage
- Number of basement bedrooms
- Number of basement bathrooms
- Whether there is a private walkout entrance
- Whether there is a separate / private entrance
- Whether there is a full kitchen, partial kitchen, or no kitchen
- Whether there is in-unit or shared laundry
- Whether utilities are included
- Whether there is private parking / driveway parking / street parking only
- Whether the basement feels like a true separate unit or just extra living space
- Renovation quality / finish quality
- Ceiling height / natural light if mentioned
- Proximity to transit, shopping, UMBC, Catonsville, Arbutus, etc.
- Any signs the unit is more suited to:
  - Single tenant
  - Couple
  - Student
  - Traveling nurse / professional
  - Family

---

## Research Method

Use actual local rental listings and market signals.

Priority order:
1. Highly similar basement or lower-level rental comps in the same ZIP
2. If not enough basement comps: accessory dwelling / in-law suite comps, or lower-level apartment comps adjusted for differences
3. If still limited: expand to nearby neighborhoods within the target ZIP cluster, but explain the adjustment

Account specifically for:

### Unit-Specific Rent Drivers
- Walkout entrance vs. no walkout
- Fully private entrance vs. shared entrance
- Private parking vs. shared / street parking
- Number of bedrooms
- Number of bathrooms
- Basement square footage
- Finish quality
- Kitchen quality
- Laundry setup
- Natural light / windows
- Utilities included or not
- Whether the basement is legally / functionally rentable as a separate unit

### Neighborhood / ZIP-Specific Rent Drivers
- Demand differences between the listed ZIP codes
- Proximity to UMBC and student demand
- Proximity to major employers / commuter routes
- Safety / desirability signals if relevant
- Whether the ZIP tends to support stronger or weaker basement-unit rents

---

## Required Reasoning Approach

Do not average rents. Instead:
1. Identify the best relevant comps
2. Explain which comps are actually comparable and which are weaker
3. Normalize for differences in bed count, bath count, sqft, entrance privacy, parking, renovation level, utilities
4. Derive a realistic rent range
5. Recommend one "base case" number to use in a calculator

---

## Output Format

Return exactly these sections:

### 1. Estimated Basement Rent
- Conservative: $X/mo
- Base case: $X/mo
- Optimistic: $X/mo

### 2. Comp Basis
List the most relevant comps used, with short notes on why each one is relevant or weak.

### 3. Adjustment Logic
Explain how you adjusted for:
- ZIP code / neighborhood
- Beds / baths
- Square footage
- Walkout / private entrance
- Parking
- Kitchen / laundry / utilities
- Finish quality

### 4. Main Rent Drivers
Bullet the top factors that raise or lower rent for this specific unit.

### 5. Confidence
Rate confidence as Low / Medium / High and explain why.

### 6. Calculator Input Recommendation
Give one final number to plug in:
- **basement rent: $X/mo**

---

## Constraints

- Focus ONLY on ZIPs: 21228, 21229, 21250, 21043, 21227
- Do not give a countywide average unless forced by lack of comps
- Do not assume a basement rents like a full above-grade apartment without adjustment
- Be conservative where privacy / legality / finish are unclear
- If the property lacks a private entrance, explicitly discount the estimate
- If the property has walkout access, private parking, a full bath, and good finish, explicitly premium the estimate
- If the unit appears especially attractive to UMBC students or nearby professionals, note it
- If there are not enough true basement comps, say so and explain your proxy method

The goal is a property-specific estimate that is realistic enough to use in a financial model — not a marketing estimate.

---

## How to Use the Output in the Calculator

The "base case" from section 6 maps to `rA` (rent during hack phase) in `compare.cjs`:

```bash
node scripts/compare.cjs '{
  "pA": 310000,
  "rA": 1100,
  "fullRentA": 2400,
  "appA": 3.0
}'
```

Use the conservative estimate for your stress test and the optimistic estimate to see upside:

```bash
node scripts/compare.cjs '[
  {"pA": 310000, "rA": 850,  "fullRentA": 2200},
  {"pA": 310000, "rA": 1100, "fullRentA": 2400},
  {"pA": 310000, "rA": 1350, "fullRentA": 2600}
]'
```
