# Instagram Unfollowers PRO v8.8.5

Follow-up to 8.8.4: classification was correct, but the scan *felt* broken — empty for
minutes, a confusing second counter, duplicate accounts, and an uncaught error at the end
on large accounts.

## English

- **No more empty screen for minutes.** 8.8.4 fetched followers to completion, then
  following — correct, but on a 5k-follower account the list stayed empty for the entire
  followers pass, then a second, smaller counter appeared to "reset" once following
  started. Followers and following are now fetched **concurrently**, published as **one**
  combined counter/progress bar. The (usually much smaller) following list now fills in
  almost immediately instead of waiting for followers to finish first.
- **Duplicate accounts (e.g. showing up 2–3 times).** Instagram's following list can
  reorder mid-pagination on large accounts, so the same account could arrive on two
  different pages. It was being pushed into a plain array with no de-duplication. Now
  kept in a map keyed by `pk`, so each account can only appear once no matter how many
  times Instagram repeats it across pages.
- **"Unexpected token '<'... is not valid JSON" aborting the whole scan.** The bulk
  `show_many` safety net (and every other list request) assumed Instagram always answers
  with JSON. On very large accounts, Instagram would occasionally answer `200 OK` with an
  HTML "please wait" page instead — parsing that as JSON threw an uncaught `SyntaxError`
  that killed the entire scan, discarding a `show_many` check for a JSON-parse hiccup. All
  JSON parsing in the REST layer is now defensive: a non-JSON 2xx response is treated like
  a rate limit (backs off and retries) on the main lists, and `show_many` just skips that
  one chunk and keeps going instead of aborting.
- Same three fixes applied to the real-time background monitor.

### Technical

- `useScanner`: followers/following loops run via `Promise.all`, sharing one `publish()`
  that recomputes `results`/`progress`/`statusMessage` from combined counts; `followingUsers`
  array replaced with a `Map<pk, RestUser>`.
- `igListsApi.ts`: new internal `safeJsonParse` (2xx + non-JSON body → treated as status
  `0`, retryable like 429); `fetchFollowedByMany` now skips a bad chunk instead of
  returning early, and only reports `429` when actually rate-limited.
- `realtimeMonitor.silentScan`: same `Map<pk, RestUser>` de-duplication.

## Español

- **Ya no se queda vacío durante minutos.** La 8.8.4 cargaba followers hasta el final y
  luego following — correcto, pero en una cuenta con 5k seguidores la lista se quedaba
  vacía durante todo el paso de followers, y al empezar following aparecía un segundo
  contador más pequeño que parecía "reiniciar" todo. Ahora followers y following se piden
  **a la vez**, publicados como **un solo** contador/barra de progreso combinada. La lista
  de following (normalmente mucho más pequeña) se rellena casi al instante en vez de
  esperar a que followers termine primero.
- **Cuentas duplicadas (salían 2–3 veces).** En cuentas grandes, la lista de following de
  Instagram puede reordenarse a mitad de paginación, así que la misma cuenta podía llegar
  en dos páginas distintas. Se guardaba en un array simple sin deduplicar. Ahora se guarda
  en un mapa indexado por `pk`, así que cada cuenta solo puede aparecer una vez sin
  importar cuántas veces Instagram la repita entre páginas.
- **"Unexpected token '<'... is not valid JSON" abortaba todo el escaneo.** La red de
  seguridad `show_many` (y cualquier petición de lista) asumía que Instagram siempre
  responde JSON. En cuentas muy grandes, a veces Instagram respondía `200 OK` con una
  página HTML de "espera un momento" en vez de JSON — al parsearla como JSON saltaba un
  `SyntaxError` sin capturar que mataba todo el escaneo por un simple fallo de parseo. Todo
  el parseo JSON de la capa REST es ahora defensivo: una respuesta 2xx sin JSON se trata
  como un rate limit (espera y reintenta) en las listas principales, y `show_many` se
  salta ese chunk concreto y sigue en vez de abortar.
- Mismos tres arreglos aplicados al monitor en tiempo real en segundo plano.
