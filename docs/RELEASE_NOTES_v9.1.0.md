# Instagram Unfollowers PRO v9.1.0

Instagram's October–November 2026 client changes broke unofficial scans (wrong `X-ASBD-ID`, missing `X-IG-WWW-Claim` / web session headers → HTML 200 instead of JSON). This release rebuilds the request stack around Instagram's current web client and ports the resilience ideas from [davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers) while keeping our safer classification rules.

## English

### Scan (the big fix)

- Every Instagram API call goes through a shared client with `X-ASBD-ID: 359341`, `X-IG-WWW-Claim`, `X-Web-Session-ID`, and CSRF — the same headers Instagram's own web app sends.
- Soft-blocks (HTML page with HTTP 200) are detected and retried with backoff instead of being treated as "zero accounts".
- Followers download can resume from a checkpoint (2h TTL) after a rate limit or soft-block, so long lists do not start over.
- A 10-minute cooldown after Instagram blocks an action survives page reloads.
- Results are never published until the followers list is complete, so mutuals cannot be marked as non-followers by mistake.
- Switching Instagram accounts mid-scan / mid-queue aborts safely.

### Unfollow & cancel

- Primary path is again `POST /api/v1/friendships/destroy/{id}/` (what Instagram uses as of Nov 2026), with GraphQL `usePolarisUnfollowMutation` as fallback when destroy answers with HTML.
- Success still requires the relationship to be gone (mutation payload and/or following-list search) — a bare 200 is not enough.
- Queues respect the shared cooldown and do not fight the silent monitor for quota.

### UI & extras

- Hub shows cooldown countdown and a resume / start-fresh banner when followers were saved.
- CSV export neutralizes spreadsheet formula injection.
- Silent realtime monitor skips while you are scanning/unfollowing or while a cooldown is active.

### Install

1. Use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.1.0`

## Español

### Escaneo (el arreglo grande)

- Todas las peticiones a Instagram pasan por un cliente compartido con `X-ASBD-ID: 359341`, `X-IG-WWW-Claim`, `X-Web-Session-ID` y CSRF — las mismas cabeceras que usa la web de Instagram.
- Los soft-blocks (página HTML con HTTP 200) se detectan y se reintentan con pausa, en vez de contarse como "cero cuentas".
- La descarga de seguidores puede reanudarse desde un punto de guardado (2 h) tras un límite o soft-block, para que las listas largas no empiecen de cero.
- Un enfriamiento de 10 minutos tras un bloqueo de Instagram sobrevive a recargar la página.
- Los resultados no se publican hasta que la lista de seguidores está completa, así un mutuo no puede aparecer como no seguidor por error.
- Si cambias de cuenta de Instagram a mitad de escaneo / cola, se aborta con seguridad.

### Dejar de seguir y cancelar solicitudes

- La ruta principal vuelve a ser `POST /api/v1/friendships/destroy/{id}/` (la que usa Instagram en nov 2026), con GraphQL `usePolarisUnfollowMutation` de respaldo si destroy responde HTML.
- El éxito exige que la relación haya desaparecido (payload de la mutación y/o búsqueda en seguidos) — un 200 solo no basta.
- Las colas respetan el enfriamiento compartido y no pelean con el monitor silencioso por cuota.

### UI y extras

- El hub muestra la cuenta atrás del enfriamiento y un banner de reanudar / empezar de cero cuando hay seguidores guardados.
- El CSV neutraliza la inyección de fórmulas en hojas de cálculo.
- El monitor en tiempo real no corre mientras escaneas / dejas de seguir o hay enfriamiento activo.

### Instalar

1. Usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/) cuando Pages publique `content.js?v=9.1.0`
