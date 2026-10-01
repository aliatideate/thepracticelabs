# Archive / hide clients

**Status:** implemented on staging (PR pending) — soft-archive via `archivedAt`.  
**Promote to production:** only via `main` → `production` PR + Ali “yes” in chat.

## Behavior

| | |
| --- | --- |
| Column | `clients.archived_at` (nullable timestamptz) |
| Creator home (default) | Active clients only (`archived_at` is null) |
| Show archived | Toggle lists archived clients; **Restore** clears `archived_at` |
| Archive | Card or detail → Archive sets `archived_at = now()` |
| Session links | Stay live while archived |
| Delete | Unchanged — only when zero sessions |
| New session / brief pickers | Active clients only (default list API) |

## API

- `GET /api/create/clients` — active  
- `GET /api/create/clients?archived=1` — archived  
- `POST /api/create/clients/:id/archive`  
- `POST /api/create/clients/:id/restore`  

## Out of scope (still)

- Deleting clients with sessions  
- Auto-expiry  
- Per-session archive  
