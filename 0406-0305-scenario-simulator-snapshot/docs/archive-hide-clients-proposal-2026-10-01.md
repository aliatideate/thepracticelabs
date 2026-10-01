# Proposal — archive / hide clients (revised)

**Status:** revised proposal — **do not build** until Ali says go.  
**Why:** Clients with any sessions cannot be deleted. Rehearsals (esp. production) leave permanent clutter on Creator home.

## Recommendation (single path)

**Soft-archive on the client row** — add nullable `archivedAt` (timestamp) on `clients`.

| Behavior | Detail |
| --- | --- |
| Creator home (default) | Show only clients where `archivedAt` is null |
| Archive | Client card or detail → “Archive” sets `archivedAt = now()` |
| Restore | “Show archived” filter → “Restore” clears `archivedAt` |
| Sessions | Unchanged; join / facilitate / try / print links **stay live** |
| Delete | Still only when **zero** sessions (unchanged rule) |
| Scope | **Client-level only** — no per-session archive in v1 |

No separate “test” flag. No moving rows into an archive table.

## Why this shape

- One column, reversible, no data migration risk to live workshop rooms  
- Operator can hide Prod Rehearsal Co / Rehearsal Co without breaking team links mid-week  
- Matches “rehearse on staging” going forward while cleaning existing prod clutter  

## Decisions locked in this revision

| Question | Answer |
| --- | --- |
| Archive vs test flag | **Archive** (`archivedAt`) |
| Session links when archived | **Remain live** |
| Session-level archive | **Not in v1** — client-level only |

## Out of scope

- Deleting clients that still have sessions  
- Auto-expiring rooms or clients  
- Multi-org / roles  

## Build path (when Ali says go)

1. Schema + bootstrap/`archived_at` on `clients` (staging first)  
2. Creator API: archive / restore endpoints (Creator auth)  
3. UI: Archive on card/detail; “Show archived” toggle on Clients  
4. Smoke on staging Creator list  
5. Production only via `main` → `production` PR + Ali “yes” in chat  

## Open only if Ali disagrees

- Prefer a status enum (`active` / `archived`) over timestamp? (timestamp is enough for v1.)  
- Should archived clients be excluded from any “new session” client picker? (Recommend **yes** — hide from default pickers too.)
