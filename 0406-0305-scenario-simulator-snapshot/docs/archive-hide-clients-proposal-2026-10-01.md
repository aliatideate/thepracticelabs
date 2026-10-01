# Proposal — archive / hide clients (hold until Ali reviews)

**Status:** proposal only — do **not** build yet.  
**Why:** Production (and staging) clients with any sessions cannot be deleted. Rehearsals leave permanent clutter. Ali asked to rehearse on staging going forward; still need a path for existing prod test clients.

## Goal

Let the one Ideate operator hide or archive rehearsal/test clients without deleting session history, so Creator home stays clean.

## Recommended shape (simple)

### Option A — Soft-hide on client (preferred)

Add `archivedAt` (nullable timestamp) on `clients` (or `hiddenAt` / `status: active|archived`).

| Behavior | Detail |
| --- | --- |
| Creator home | Default list = non-archived only |
| Toggle | Client card or detail: “Archive” / “Restore” |
| Sessions | Unchanged; join/facilitate links keep working |
| Delete | Still only when **zero** sessions (current rule) |
| Empty archive | Optional “Show archived” filter on Clients |

**Why preferred:** One column, no data move, reversible, no risk to live workshop rooms.

### Option B — “Test” flag

`isTest` boolean + filter chip. Weaker than archive (doesn’t communicate “done”); overlaps with naming discipline.

### Option C — Hard move to archive table

Copy/move sessions out of live client. Heavier; not needed for clutter control.

## Out of scope (for this proposal)

- Deleting clients that still have sessions  
- Auto-expiring rehearsal rooms  
- Multi-org / roles  

## Ship path (when approved)

1. Schema + migration on staging  
2. Creator UI: Archive / Restore + “Show archived”  
3. Smoke on staging Clients list  
4. Promote only with Ali OK (nothing beyond #36 without approval)

## Open questions for Ali

1. Prefer **Archive** (Option A) vs **Test flag** (Option B)?  
2. Should archived clients’ session links remain live (recommended yes)?  
3. Any need to archive **sessions** individually, or is client-level enough?
