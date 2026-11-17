# Archived-PDF usage control

The portfolio beta uses the user's selected **1,000 archive requests per UTC day**, with a 60-request/minute burst ceiling shared by every source-viewer function instance. The minute/day limits count syntactically valid signing attempts, including attempts whose source is later unavailable. They are not a count of unique people, completed downloads or viewed PDF pages.

`source_viewer_budget` is a private singleton row. The service-only `take_source_viewer_slot()` RPC locks it, reads the database clock after obtaining the lock, checks both windows, and reserves a slot atomically. It stores no IP address, browser identifier or aircraft profile. Anonymous/authenticated callers cannot read/update the row or invoke the RPC. A disabled/missing budget or failed RPC prevents signing and returns a generic 503. Malformed requests are rejected before reservation.

The viewer returns 429 with a bounded `Retry-After` when a window is exhausted. CORS exposes this header; the browser explains the wait and disables that PDF button until retry is due. Official-source links and the rest of the graph remain available. Requests are not automatically retried. Existing source publication, hash/path, parent/attachment and five-minute signed-URL checks remain enforced.

The deployed backend was checked for anonymous denial, exact shared counting under three concurrent reservations, 60/minute and 1,000/day configuration, successful signing through the budget gate, actual PDF bytes and malformed-request rejection. Local PostgreSQL tests additionally cover exhaustion, minute/day resets, service-only access and fail-closed pause; browser tests cover visible 429 recovery.

## Operations

Only the operator's privileged database connection may change the configuration. For example, the reviewed emergency pause is:

```sql
update public.source_viewer_budget set enabled=false where id=1;
```

Re-enable after investigating usage. Changing limits should retain the same private access policies. Do not reset usage counters to make a failed test pass; test exhaustion in the isolated database/fixtures. The application is deliberately anonymous, so a determined caller can consume the shared allowance and affect other users. That tradeoff favors a conservative portfolio signing budget over promising unlimited availability.

This is **not a billing cap**. Rejected function calls can still incur invocation/database work, and an already-issued URL can be reused until expiry. Storage download bandwidth is not metered by this counter. Provider usage alerts, spending controls and optional gateway-level abuse protection remain separate operating controls. No paid plan or provider budget setting was changed.
