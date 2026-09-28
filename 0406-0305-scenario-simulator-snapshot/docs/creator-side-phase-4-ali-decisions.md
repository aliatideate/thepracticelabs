# Phase 4 — Ali decisions (2026-09-29) + answers

Companion to `creator-side-phase-4-occurrence-report.md`. Still **no tokenisation committed** until intro sentence + remaining OKs land.

---

## 1. GBC-W35 filenames

**What W35 is:** calendar **week 35** (2026). Demand evidence copy refers to “week 35” / value `2026 W35` (control-tower snapshot). So `GBC-W35-…` = company short code + week label + doc type.

**v2 behaviour (agreed):** do not hardcode `GBC`. Build download labels from the session’s resolved short name (slug) + week token, e.g. `{shortSlug}-W35-availability.xlsx`. If short name is empty, fall back to workshop/session code. Implementation waits for tokenisation pass.

---

## 2. Long weekend + Sharjah/Ajman dateline

- **long weekend:** **LOCK** (UAE pack; region packs later).
- **`$.reveal.dateline` = `Sharjah & Ajman edition, one month on`:** this is a **general regional newspaper dateline**, not one of the six branch areas.
  - Six branches: Al Nahda, Muwaileh, Al Majaz, Ajman Corniche, Al Rashidiya, University City.
  - “Ajman” appears inside branch **Ajman Corniche**, but the dateline names the emirates Sharjah & Ajman as an edition, not that store.
  - **LOCK** the dateline for v2 (UAE-only renames). Cross-country / currency / weekend / dateline packs later.

---

## 3. Mart intro — proposed sentence (awaiting commit OK)

**Current:** `You're a Gulf Beverages field rep.`  
**Proposed:** `You're a field rep for Gulf Beverages.`

With token: `You're a field rep for {{company.name}}.`

### Other article / possessive checks (Mart + Demand)

| Location | Text | Risk | Action |
| --- | --- | --- | --- |
| Mart `$.intro.role` | You're a Gulf Beverages field rep. | a/an | Rephrase as above |
| Mart `$.playbook.title` | The Gulf Beverages Playbook | “The” + name; doubles if client name already starts with “The” | Keep pattern; rare edge case — note in customise helper later if needed |
| Elsewhere | No `Gulf Beverages'`, `an Gulf`, `a Saha`, `Saha Mart's` | — | None found |

Demand has no a/an attachment of company name into a following noun phrase beyond “Gulf Beverages Co. is …”.

---

## 4. Media audit (legible text / branding)

Treat **none** as replaceable until Ali confirms. Chain name stays tokenisable in **copy** unless you lock it after review.

| File | Legible text / branding |
| --- | --- |
| `gulf-logo.png` | **Yes — company logo.** Text “Gulf / Beverages / Co.” + orange+wave emblem. (Demand logo variable; not a Mart scene lock.) |
| `mart-scene.png` … `mart-scene-6.png` | **No legible text.** No “Saha Mart” on signage. Generic store interiors; product labels are abstract colour blocks. |
| `mart-travel-1.png` (and siblings, same art language) | **No legible text.** White car with **orange fruit + leaf** door mark (graphic only). |
| `mart-door.svg` | Door graphic only — no text. |
| `mart-phone.svg` | Phone graphic only — no text. |
| `options/Icons.png` | Symbols only: barcode gun, “…”, shelf with **`%`**, hanging sign with **orange fruit**, juice carton with same fruit, notebook. **No alphanumeric brand names.** |
| `options/Q101–Q603.png` | Sampled Q101/Q201/Q401/Q601: icons (shelf+`%`, handshake, sealed envelope with sprout stamp, etc.). **No “Saha” / “Gulf” lettering found.** Remaining Q* follow same icon set. |
| `options/Icons 2.png` | Sheet variant of icon set (same language). |

**Implication for chain name:** no storefront “Saha Mart” in scene art → copy tokenisation of `Saha Mart` / `Saha Marts` can stay **PROPOSE** unless you still want to lock after eyeballing.

---

## 5. Plant city (Dubai)

All three Demand occurrences are **plain location labels** (overview “site in Dubai”, memo “Dubai factory”, “The Dubai plant runs…”). **No** copy ties Dubai to distance/transit time to KSA or Qatar.  
→ **PROPOSE** `company.plantCity` for v2.

---

## 6. Pre-approval checks (will do before asking you to sign off v2)

(a) Render v2 with **default** variable values → byte/string-identical to v1 content (show diff).  
(b) v1 rows + Unilever sessions/archives **untouched**.  
(c) Every variable has `maxLength`; customise UI demonstrates long-name layout impact.

---

## Open for Ali

1. OK to commit Mart intro as: `You're a field rep for Gulf Beverages.`?  
2. After media list above: keep chain name tokenisable, or lock?  
3. Any other cut before we implement tokenisation + (a)(b)(c)?
