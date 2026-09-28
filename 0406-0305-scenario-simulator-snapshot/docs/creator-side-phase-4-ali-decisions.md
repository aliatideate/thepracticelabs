# Phase 4 — Ali decisions (2026-09-29) + implementation notes

Companion to `creator-side-phase-4-occurrence-report.md`.

---

## Approved (paste message, 2026-09-29)

1. **Mart intro** — commit as `You're a field rep for {{company.name}}.`  
   Check (a): **default v2 is identical to v1 except this sentence.**
2. **“The Gulf Beverages Playbook”** — keep wording; validate company name **cannot start with “The ”**.
3. **Chain name** — stays tokenisable; plural derived from singular (`name + "s"`), shown next to the field.
4. **Rename limits** — UAE-only and beverage/FMCG-only for now; note on customise screen (scene art implies drinks).
5. **Tokens resolve** in facilitator notes Markdown **and** CSV/JSON exports.
6. **Filename slug** — lowercase ASCII hyphens; session code fallback.
7. **Logo preview** — dark + light surfaces, wide + square frames on customise.

Tokenisation into v2 proceeds on those terms. Show diff + long-name preview before final sign-off.

---

## 1. Intro sentence — old vs new

| | Sentence |
| --- | --- |
| **v1 (old)** | `You're a Gulf Beverages field rep.` |
| **v2 template** | `You're a field rep for {{company.name}}.` |
| **v2 default resolved** | `You're a field rep for Gulf Beverages.` |

Information: both identify the learner as a field rep for the company. The rephrase moves the company name after “for” so a/an never attaches to a client brand. No other meaning is dropped.

---

## 2. GBC-W35 filenames

**What W35 is:** calendar **week 35** (2026).

**v2 behaviour:** `{shortSlug}-W35-availability.xlsx` (etc.). Slug from `company.shortName`; if empty, session/workshop code; else `gbc`.

---

## 3. Long weekend + Sharjah/Ajman dateline

**LOCK** (UAE pack).

---

## 4. Media / chain

No “Saha Mart” lettering in scene art → chain stays tokenisable. Plural derived.

---

## 5. Plant city (Dubai)

**Tokenised** as `company.plantCity`.

---

## 6. Pre-approval checks

(a) Default v2 ≡ v1 **except** Mart `$.intro.role` (see above). Demand identical except added optional `company.shortName` field.  
(b) v1 rows + Unilever `DEFAULT` / `MART` sessions stay on frozen v1 snapshots.  
(c) Every variable has `maxLength`; customise “Preview long names” demonstrates layout impact.

---

## 7. Facilitator notes + exports

| Surface | Token resolution |
| --- | --- |
| `exercise_versions.facilitator_notes` (Markdown) | Resolved into `workshop_sessions.resolved_facilitator_notes` on create |
| In-content Mart `decisions[*].facilitator.note` | Via `resolved_content` walk (no company names today) |
| Demand `/api/export` CSV+JSON | Uses `scenarioForCode(workshopCode)` |
| Mart `/api/mart/export` CSV+JSON | Uses `decisionGameFacilitatorForCode(workshopCode)` |
