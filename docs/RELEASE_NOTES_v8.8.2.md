# Instagram Unfollowers PRO v8.8.2

Critical fix release. Instagram quietly killed the legacy GraphQL query the live scan
depended on since day one — it kept answering `200 OK` with the real `count`, but an
always-empty `edges` array. That is [issue #5](https://github.com/EdvinCodes/InstagramUnfollowers/issues/5):
"Results not displaying in latest version", open for a month.

## English

### Fixed

- **🔴 Live scan showed 0 results, instantly.** The `query_hash=3dec7e2c57367ef3da3d987d89f9dbc8`
  GraphQL endpoint (used since the very first version) stopped returning `edges` around
  August 2026. The app now fetches following/followers through the same private REST
  endpoints Instagram's own web app uses (`/api/v1/friendships/{id}/following/` and
  `/followers/`), paginated the same anti-ban way as before.
- **🛡️ No more silent "fake success".** If Instagram ever answers with an empty list again
  while its own profile-info endpoint reports a positive following count, the scan now
  stops and reports it as blocked instead of quietly saving an empty snapshot over your
  real history.
- **🔁 Cancel pending requests no longer dies on the first 429.** Cancelling thousands of
  outgoing requests reliably hit `429 Too Many Requests` on the user lookup step and used
  to abort the whole queue immediately, forcing a manual restart over and over. It now
  backs off automatically (growing wait + live countdown) and retries the same account up
  to 3 times before ever asking you to pause manually.
- Real-time background monitor (silent unfollower alerts) migrated to the same REST calls.

### Technical

- New `src/utils/igListsApi.ts`: REST following/followers client + the "empty page but
  positive count" guard, unit tested.
- `useScanner`, `realtimeMonitor` rewritten on top of it; dead `urlGenerator`/GraphQL types
  removed from `utils.ts` / `model/user.ts`.
- `usePendingRequests` cancel queue: exponential backoff (`computeBackoffMs`, capped, with
  jitter), shared with the same rate-limit constants as the Growth engine.

## Español

### Arreglado

- **🔴 El escaneo en vivo mostraba 0 resultados, al instante.** El endpoint GraphQL
  `query_hash=3dec7e2c57367ef3da3d987d89f9dbc8` (usado desde la primera versión) dejó de
  devolver `edges` en torno a agosto de 2026, aunque seguía respondiendo `200 OK` con el
  `count` real. La app ahora obtiene following/followers por los mismos endpoints REST
  privados que usa la propia web de Instagram, con la misma cadencia anti-baneo de antes.
- **🛡️ Se acabó el "éxito falso" silencioso.** Si Instagram vuelve a devolver una lista
  vacía mientras su propio endpoint de perfil informa un following > 0, el escaneo se
  detiene y lo reporta como bloqueado en vez de guardar un snapshot vacío encima de tu
  historial real.
- **🔁 Cancelar solicitudes pendientes ya no muere en el primer 429.** Al cancelar miles de
  solicitudes salientes, el paso de búsqueda de usuario recibía `429 Too Many Requests` casi
  de inmediato y abortaba toda la cola, obligando a reiniciar a mano una y otra vez. Ahora
  espera con backoff creciente (con cuenta atrás visible) y reintenta la misma cuenta hasta
  3 veces antes de pedir pausa manual.
- El monitor en tiempo real (alertas silenciosas) migrado a los mismos endpoints REST.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/)
