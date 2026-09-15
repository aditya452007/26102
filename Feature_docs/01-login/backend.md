# SPEC 01b — Login Backend (`/api/v1/auth`)

> Backend contract for SPEC 01's login screen. Decision (ADR-028, 2026-09-14): **JWT bearer,
> role-scoped** — not the prototype cookie session, not refresh tokens. Matches the frontend
> models that already exist (`officerRoleSchema`: district/state/ministry; login hint
> `officer.demo@example.com / demo1234`).
> Companion docs: `structure.md` §auth feature · `data-model.md` §officers ·
> `api-reference.md` §Auth.

## Endpoints

### `POST /api/v1/auth/login`

```jsonc
// Request  — LoginIn
{ "email": "officer.demo@example.com", "password": "demo1234" }

// 200 — TokenOut
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9…",
  "token_type": "bearer",
  "expires_in": 3600,
  "officer": {                      // the login screen + header render this
    "id": "3f1c…",
    "fullName": "Demo Officer",
    "email": "officer.demo@example.com",
    "role": "ministry",             // "district" | "state" | "ministry"
    "stateScope": null,             // "Madhya Pradesh" for state role
    "districtScope": null           // "Bhopal" for district role
  }
}

// 401 — wrong credentials (NEVER say which field was wrong)
{ "detail": "Invalid email or password" }
```

### `GET /api/v1/auth/me`

Returns the same `officer` object from the bearer token — the header role-switcher and SSR
loaders re-hydrate scope from this instead of trusting the client. 401 when token missing/
expired. (No `/register`, no `/refresh`, no `/logout` endpoint in v1: logout = client discards
the token; register is out of scope per SPEC 01.)

## Token design

| Property | Value | Why |
|---|---|---|
| Format | JWT HS256, `python-jose` | single dependency, no asymmetric keys for v1 |
| Claims | `sub` (officer id) · `email` · `role` · `state_scope` · `district_scope` · `exp` · `iat` | scope rides in the token; repos read claims, not joins, on hot paths |
| Lifetime | `3600` s (1 h) — `JWT_EXPIRY` setting | demo-long enough, short enough to feel real |
| Secret | `JWT_SECRET` env var, required at boot (app refuses to start without it) | no default secret, ever |
| Transport | `Authorization: Bearer <token>` | the server-fn proxy attaches it; browser storage choice stays frontend's (httpOnly cookie is acceptable too) |

**Token ↔ role-switcher relationship**: SPEC 01's header role switcher is a *view* filter; the
token's role is the *authorization* ceiling. A `ministry` officer may view the district lens;
the reverse is enforced server-side (§RBAC). v1 keeps demo honesty: switching the header lens
does **not** re-login — every request still carries the officer's true role claim, and the
scoping predicates below apply to it.

## Password + officer seeding

- Hashing: `passlib[bcrypt]`, cost default (12). `demo1234` seeded for all demo officers.
- The seed generator (§5) creates exactly three demo officers so all three lenses are
  demoable immediately:
  | email | role | scope |
  |---|---|---|
  | `officer.demo@example.com` | ministry | — (all states) |
  | `state.demo@example.com` | state | `Madhya Pradesh` |
  | `district.demo@example.com` | district | `Bhopal` |
- Hashes are generated at seed time, never stored in the repo or the docs.

## RBAC — how scoping is enforced (the "not very strict, but works" bar)

One dependency guards every scoped endpoint:

```python
# core/security.py
def current_officer(token: str = Depends(oauth2_scheme)) -> OfficerClaims:
    """Decode JWT → OfficerClaims(role, state_scope, district_scope). 401 on any failure."""

def scope_of(officer: OfficerClaims) -> Scope:
    """ministry → all states/districts; state → {state_scope}; district → {district_scope}."""
```

- Every list endpoint receives `scope_of(officer)` and applies it **in the repo query**
  (`structure.md` §repo) — scope is never a frontend filter and never an after-thought in the
  service.
- Writes (`POST /decisions`, `POST /evidence`, `POST /detectors/recompute`): verify the target
  work/row is inside scope **before** writing → `403 {"detail": "Work outside your scope"}`
  otherwise.
- `POST /detectors/recompute` additionally requires `role == "ministry"` (state/district get
  403) — recompute affects every officer's data.
- Data model note: v1 works are stored with a single `district` string; scope matching is
  exact-string (case-normalised at ingest). Fine for demo; real multi-district officers are a
  future `officer_districts` join table — noted in `data-model.md`, not built now.

## Frontend integration (SPEC 01 edits when backend lands)

- `login-form.tsx` submit → server-fn `POST /auth/login` → store `access_token` +
  `officer` in a zustand auth store (persisted) → navigate `/overview`. Any-input login
  **ends**: 401 shows inline error "Invalid email or password"; the demo hint credentials
  remain on the card.
- `createServerFn` helpers attach `Authorization: Bearer` from the store on every backend
  call and surface 401 as a redirect to `/login` (one helper, `api.ts`).
- On boot (`__root` loader or `/overview` loader): `GET /auth/me` to re-validate; failure →
  clear store → `/login`.

## Acceptance (backend)

- Correct credentials → 200 + token whose claims match the seeded officer row.
- Wrong password → 401 with the exact generic detail string above.
- Expired/garbage token on `/auth/me` → 401; all scoped endpoints enforce the §RBAC table
  (integration test: district officer cannot read state-wide works or write outside scope).
