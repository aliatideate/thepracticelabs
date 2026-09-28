# Phase 4 — Occurrence report (review before tokenisation)

**Do not tokenise until Ali approves this report.**  
Sources: `content/scenario.json`, `content/decision-game.json`, plus noted UI constants / media.

Legend: **PROPOSE** = candidate to tokenise · **FLAG** = needs your call · **LOCK** = leave as teaching geography / mechanics.

---

## A. The Demand Spike

### A.1 Proposed variables

#### `company.name` — default `Gulf Beverages Co.`

| Path | Surrounding text | Notes |
| --- | --- | --- |
| `$.company.name` | `Gulf Beverages Co.` | Canonical full name. **PROPOSE** |
| `$.company.overview` | “**Gulf Beverages Co.** is a regional beverage manufacturer…” | Same full form. **PROPOSE** (replace this occurrence with `{{company.name}}`) |

#### `company.shortName` — default `Gulf Beverages`

| Path | Surrounding text | Notes |
| --- | --- | --- |
| `$.evidence[0].blocks[5].attribution` | “**Gulf Beverages** key-account note, Doha” | No “Co.” **PROPOSE** shortName. **FLAG:** “Doha” stays (Qatar teaching geography). |

Grammar / article: overview uses “Gulf Beverages Co. **is** …” — fine for most client names; awkward if client name starts with a plural-sounding brand. No possessives (“Gulf Beverages’”) found.

#### `company.plantCity` — default `Dubai`

| Path | Surrounding text | Notes |
| --- | --- | --- |
| `$.company.overview` | “…single production site in **Dubai**…” | **PROPOSE** |
| `$.evidence[2].sourceLabel` | “Plant operations memo · **Dubai** factory · 27 Aug 2026” | **PROPOSE** |
| `$.evidence[2].blocks[1].text` | “The **Dubai** plant runs three beverage lines…” | **PROPOSE** |

#### `company.logo` — default `gulf-logo.png`

| Path | Notes |
| --- | --- |
| `$.company.logo` | Filename today; runtime resolves under `/content/media/`. **PROPOSE** as image variable (asset URL after upload). |

### A.2 Do **not** tokenise (locked / flagged)

| Pattern | Count (approx) | Paths / examples | Call |
| --- | --- | --- | --- |
| UAE | 9 | Rohini answers, evidence, etc. | **LOCK** (markets) |
| KSA | 6 | Forecast / allocation answers | **LOCK** |
| Qatar | 7 | Markets + evidence | **LOCK** |
| Saudi Arabia | 1 | `$.company.facts[0].value` “UAE, Saudi Arabia, Qatar” | **LOCK** |
| Doha | 1 | Attribution on key-account note | **LOCK** (with shortName on company part only) |
| “across **the Gulf**” | 1 | `$.company.overview` — geographic Gulf, not company | **LOCK** — must not become company token |
| AED | 0 in JSON | — | n/a |
| long weekend | 0 in Demand JSON | — | n/a |

### A.3 GBC (short code) — not in content JSON

| Location | Text | Call |
| --- | --- | --- |
| `artifacts/scenario-simulator/src/lib/constants.ts` | Download labels `GBC-W35-availability.xlsx`, `GBC-W35-capacity-memo.pdf`, `GBC-W35-retailer-complaints.pdf` | **FLAG** — cosmetic download filenames only; tokenising needs code change beyond content JSON. Recommend leave GBC for v1 or add later `company.code` if you care. |

### A.4 Demand media (branding / text)

| Asset | Role | Visible branding? |
| --- | --- | --- |
| `gulf-logo.png` / `gulf-beverages.svg` | Company logo on brief | **Yes — replace via logo variable** |
| `rohini.png`, `fatima.png`, `james.png`, `rakesh.png` | Stakeholder avatars | Faces only; no company wordmarks expected |
| Practice Labs logos | App chrome | Out of scope |

---

## B. A Week in the Field

### B.1 Proposed variables

#### `company.name` — default `Gulf Beverages` (no “Co.” in Mart)

| Path | Surrounding text | Notes |
| --- | --- | --- |
| `$.intro.role` | “You're a **Gulf Beverages** field rep.” | **PROPOSE**. **FLAG grammar:** “a / an” depends on next word sound of replacement (“a Qanat…”, “an Emirates…”). May need copy tweak to “You're a field rep for {{company.name}}.” |
| `$.playbook.title` | “The **Gulf Beverages** Playbook” | **PROPOSE** |
| `$.decisions[1].situation` | “…if **Gulf Beverages** gives an extra 5% off.” | **PROPOSE** |
| `$.decisions[1].options[1].deferred.standfirst` | “A quieter weekend for **Gulf Beverages**…” | **PROPOSE** |
| `$.decisions[1].options[2].deferred.headline` | “…while **Gulf Beverages** deliberates” | **PROPOSE** |
| `$.decisions[3].situation` | “…if **Gulf Beverages** commits to exclusive supply…” | **PROPOSE** |
| `$.decisions[3].options[0].deferred.headline` | “**Gulf Beverages** hit with penalties…” | **PROPOSE** |
| `$.decisions[3].options[1].deferred.standfirst` | “…nobody at **Gulf Beverages** got to consider.” | **PROPOSE** |
| `$.decisions[3].options[2].deferred.headline` | “**Gulf Beverages** signs three-branch deal…” | **PROPOSE** |
| `$.decisions[4].options[1].deferred.standfirst` | “**Gulf Beverages** keeps its sampling budget…” | **PROPOSE** |
| `$.decisions[4].options[2].deferred.headline` | “…while **Gulf Beverages** waits” | **PROPOSE** |
| `$.decisions[5].options[0].deferred.headline` | “…email to **Gulf Beverages** commercial” | **PROPOSE** (same string also has Saha Marts) |

No `Gulf Beverages Co.` in Mart. No separate shortName needed unless you want parity with Demand.

#### `chain.name` — default `Saha Mart` · `chain.namePlural` — `Saha Marts`

| Path | Text | Notes |
| --- | --- | --- |
| `$.decisions[0..5].location.name` | `Saha Mart, {branch}` | Split into chain + branch tokens. **PROPOSE** |
| `$.decisions[3].options[1].deferred.headline` | “three **Saha Mart** branches” | Singular form used as adjective. **PROPOSE** `chain.name` |
| `$.decisions[5].options[0].deferred.headline` | “**Saha Marts** forwards…” | Plural. **PROPOSE** `namePlural` |
| `$.decisions[5].options[1].deferred.headline` | “Monthly pricing holds at **Saha Marts**…” | **PROPOSE** plural |
| `$.decisions[5].options[2].deferred.headline` | “…holds at **Saha Marts** after…” | **PROPOSE** plural |

#### Branch area tokens (six)

| Key | Default | Paths (representative) |
| --- | --- | --- |
| `branches.alNahda` | Al Nahda | `location.name`; deferred headlines “Al Nahda shoppers…”, “…at Al Nahda” |
| `branches.muwaileh` | Muwaileh | `location.name`; headlines “Muwaileh manager…”, “Muwaileh end-cap…” |
| `branches.alMajaz` | Al Majaz | `location.name`; headlines “…Al Majaz sales…” |
| `branches.ajmanCorniche` | Ajman Corniche | `location.name` only (full phrase) |
| `branches.alRashidiya` | Al Rashidiya | `location.name`; tasting headlines |
| `branches.universityCity` | University City | `location.name` only |

### B.2 Flagged — not proposed without your OK

| Pattern | Paths | Why |
| --- | --- | --- |
| **long weekend** | `$.intro.setting`; Muwaileh deferred headline | UAE retail calendar teaching beat — **FLAG / recommend LOCK** |
| **Sharjah & Ajman** | `$.reveal.dateline` “Sharjah & Ajman edition…” | Geography in newspaper reveal — **FLAG**. Ajman also appears inside “Ajman Corniche” branch name (tokenise branch; don’t strip Ajman from dateline unless you want a city variable). |
| Playbook rules body | `$.playbook.rules[*]` | Mechanics — **LOCK** (title can take company name) |
| Grades / weights / door types | under each option | **LOCK** |

### B.3 Mart media (branding / text)

| Asset | Role | Visible branding? |
| --- | --- | --- |
| `mart-scene.png` … `mart-scene-6.png` | Branch scenes | Likely generic store photography — **FLAG:** confirm no “Saha” / Gulf wordmarks in pixels |
| `mart-travel-*.png` | Travel beats | Same |
| `mart-door.svg`, `mart-phone.svg` | UI chrome | Unlikely branded |
| `options/Q*.png`, `Icons*.png` | Option icons | Teaching icons; **FLAG** if any contain brand text |
| Company logo | Not referenced as logo field in Mart JSON today | **FLAG:** add logo variable only if we surface a logo in Mart UI |

---

## C. Decisions needed from you

1. Demand: approve `company.name`, `shortName`, `plantCity`, `logo` as above?
2. Demand: leave `GBC-W35-…` download filenames alone?
3. Mart: approve company + chain (+ plural) + six branches?
4. Mart: lock “long weekend” and Sharjah/Ajman dateline?
5. Mart intro grammar: keep “You're a {{company.name}} field rep.” or rephrase to avoid a/an?
6. Any image you know is branded that isn’t listed?

---

## D. After approval

Tokenise → insert exercise_versions **v2** with `variables` → wire customise → staging smoke with a renamed client → only then production. Unilever historical sessions stay on v1 resolved snapshots.
