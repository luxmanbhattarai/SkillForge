# API surface: versioning, pagination, filtering, errors

- One versioning strategy, applied consistently. URI versioning
  (`/v1/orders`) is the simplest to operate and cache; header or
  media-type versioning hides the version from the URL but complicates
  routing, caching, and debugging. Never mix strategies in one API.
  Never remove a field or change a field's meaning in a released
  version: add, deprecate with a `Deprecation` header and a sunset
  date, then remove in a new major version.
- Pagination is mandatory on every collection endpoint. Prefer
  cursor-based pagination for large or frequently-changing
  collections (stable under inserts, no deep-offset cost); offset
  pagination is acceptable only for small, stable collections.
  Cap page sizes server-side and document the cap.
- Filtering, sorting, and field selection follow one convention
  across the API (query parameters for REST), and every filterable
  field is indexed or explicitly documented as unindexed.
- Errors use RFC 9457 problem details (`application/problem+json`)
  with `type`, `title`, `status`, and `detail`, plus an
  extension member for machine-readable error codes. The same
  error type always maps to the same status code. Never return
  stack traces, internal identifiers, or database errors.
