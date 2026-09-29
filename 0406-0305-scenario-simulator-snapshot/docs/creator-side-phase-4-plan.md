# Creator side — Phase 4 plan (tokenisation)

Status: **tokenisation implemented on v2** (awaiting Ali sign-off on diff + long-name preview).

Brief §4 + §8 phase 4. Depends on Phase 3/5 (resolve + customise UI exist; variables still `[]`).

---

## 1. Goal

Make Demand Spike and Week in the Field safely renameable per client: company (and short name where used), logo, plant city (Demand), retail chain + six branch areas (Mart). Markets / teaching geography stay locked unless you say otherwise.

## 2. Sequence (brief §4)

1. **Occurrence reports** (this deliverable) — every proposed substitution with JSON path + surrounding sentence; grammar / location flags; branded image list.
2. **Your review** — approve, cut, or reclassify each candidate.
3. **Only then:** tokenise content → new `exercise_versions` (v2) with `variables` schema → seed + customise UI shows those fields → session create resolves tokens into `resolved_content`.
4. Staging smoke → prod after green light. Legacy Unilever sessions keep frozen v1 snapshots (Gulf Beverages intact).

## 3. Proposed variable keys (pending approval)

### Demand Spike (`investigation`)

| Key | Default | Type | Notes |
| --- | --- | --- | --- |
| `company.name` | Gulf Beverages Co. | text | Full legal-ish name |
| `company.shortName` | Gulf Beverages | text | Used in prose without “Co.” |
| `company.logo` | gulf-logo.png / asset URL | image | Via existing assets upload |
| `company.plantCity` | Dubai | text | Plant site only |

**Not proposed:** UAE, KSA, Qatar, Saudi Arabia, Doha, AED, “the Gulf” (region), market lists, evidence filenames (`GBC-W35-…` in UI constants — separate call).

### Week in the Field (`branching`)

| Key | Default | Type | Notes |
| --- | --- | --- | --- |
| `company.name` | Gulf Beverages | text | No “Co.” in Mart content today |
| `company.logo` | (if used) | image | Scene art is generic; logo may be N/A |
| `chain.name` | Saha Mart | text | Singular |
| `chain.namePlural` | Saha Marts | text | Headlines use plural |
| `branches.alNahda` | Al Nahda | text | |
| `branches.muwaileh` | Muwaileh | text | |
| `branches.alMajaz` | Al Majaz | text | |
| `branches.ajmanCorniche` | Ajman Corniche | text | |
| `branches.alRashidiya` | Al Rashidiya | text | |
| `branches.universityCity` | University City | text | |

**Not proposed (flagged for you):** “long weekend”, Sharjah & Ajman dateline, playbook substance, option consequences / scoring.

## 4. Engineering after approval (not started)

- Tokenise `content/scenario.json` + `content/decision-game.json` (or DB seed path only — prefer new version rows from tokenised JSON).
- Declare `variables` on v2; keep v1 immutable for Unilever history.
- Validate: every `{{token}}` declared; every declared variable used.
- Customise step in `/create/.../new` already has hooks; wire text + logo fields to keys.
- Hardening `resolveContentTokens` validation on create.
- Staging create → preview → play shows renamed strings; Unilever DEFAULT/MART unchanged.

## 5. Report location

See `docs/creator-side-phase-4-occurrence-report.md` (same folder).
