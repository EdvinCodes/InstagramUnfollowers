# Instagram Unfollowers PRO v8.8.6

Follow-up to 8.8.5 (issue #5): results now load, but on large accounts the scan no
longer *felt* like 8.3.0 — everyone looked like a non-follower for a long time, then
reshuffled into mutuals as a slow second pass caught up. This release removes that
second pass entirely.

## English

- **Real-time sorting is back.** 8.3.0's old GraphQL following list told us instantly,
  per account, whether it followed back (`follows_viewer`). That query is gone, and
  Instagram's REST replacement frequently omits that flag on large ("big list")
  accounts — exactly the "I follow 5k accounts" case from this issue. 8.8.4/8.8.5
  compensated by ALSO paginating your entire **followers** list in parallel and
  cross-referencing it, which is correct eventually, but on a big account that second
  list can take as long as following itself — so for most of the scan almost every
    10|  account displayed as a non-follower and kept jumping to "Mutuals" as followers
  slowly caught up. Confusing, and nothing like the old "fast and simple" feel.
- **The fix: ask, don't wait.** The scan now fetches **only** your following list (like
  8.3.0). The moment a page loads, any account Instagram didn't already label is
  checked with a single bulk `show_many` request — the same follow-back check
  Instagram's own app relies on — so each page is classified correctly within a second
  of appearing, not minutes later. No separate followers pass, no reclassification
  churn, and meaningfully fewer requests overall (kinder to rate limits).
- **Simpler, honest progress.** The progress bar and "Analyzed X / Y" counter are back
    20|  to tracking your following list only (Y = accounts you follow), instead of a
  blended following+followers number that didn't match what you were watching load.
- Same fix applied to the real-time background monitor, so it also stops doing a full
  followers pass every 30 minutes just to avoid a false "new unfollower" alert.

### Technical

- `useScanner`: dropped the parallel `runFollowers` phase entirely. The following loop
  now calls `fetchFollowedByMany` per page (chained, not parallel, so at most one
  `show_many` request is in flight — it overlaps with the existing anti-ban
  `pacingSleep` instead of adding wall-clock time) for whatever that page's
    30|  `friendship_status` didn't resolve. A short final sweep after the loop catches any
  stragglers from a rate-limited/failed per-page check. Progress/status now derive
  from `followingByPk.size` vs. the following total only.
- `igListsApi.findUnclassifiedUserIds`: now also skips accounts with
  `followedBy === false` (Instagram's explicit "no") — only `null` (genuinely unknown)
  triggers a `show_many` call, which matters a lot now that this runs once per page
  instead of once per scan.
- `realtimeMonitor.silentScan`: same change — following list + per-scan `show_many`
  sweep, no more full followers pagination.

## Español

- **Vuelve el orden en tiempo real.** La antigua consulta GraphQL de following de la
    40|  8.3.0 decía al instante, por cuenta, si te seguía de vuelta (`follows_viewer`). Esa
  consulta desapareció, y el reemplazo REST de Instagram muchas veces omite ese dato en
  cuentas grandes ("big list") — justo el caso de "sigo a 5k cuentas" de este issue. Las
  versiones 8.8.4/8.8.5 lo compensaban pidiendo TAMBIÉN toda tu lista de **followers** en
  paralelo y cruzándola, lo cual acaba siendo correcto, pero en una cuenta grande esa
  segunda lista puede tardar tanto como following — así que durante casi todo el escaneo
  casi todas las cuentas salían como no seguidores y iban saltando a "Mutuos" a medida
  que followers las alcanzaba. Confuso, y nada que ver con lo "rápido y sencillo" de
  antes.
    50|- **La solución: preguntar, no esperar.** El escaneo ahora solo pide tu lista de
  following (como en la 8.3.0). En cuanto carga una página, cualquier cuenta que
  Instagram no etiquetó ya se comprueba con una petición `show_many` — el mismo chequeo
  de "me sigue de vuelta" que usa la propia app de Instagram — así que cada página queda
  bien clasificada en un segundo, no minutos después. Sin segunda lista de followers, sin
  reclasificaciones, y bastante menos peticiones en total (mejor para evitar límites).
- **Progreso simple y honesto.** La barra de progreso y el contador "Analizados X / Y"
  vuelven a basarse solo en tu lista de following (Y = cuentas que sigues), en vez de un
  número mezclado de following+followers que no coincidía con lo que veías cargar.
    60|- Mismo arreglo aplicado al monitor en tiempo real, que también deja de hacer una
  pasada completa de followers cada 30 minutos solo para evitar una alerta falsa de
  "nuevo no seguidor".

### Technical

- `useScanner`: se elimina por completo la fase paralela `runFollowers`. El bucle de
  following ahora llama a `fetchFollowedByMany` por página (encadenado, no en paralelo,
  así que como máximo hay una petición `show_many` en curso — se solapa con el
  `pacingSleep` anti-baneo que ya existía en vez de sumar tiempo de espera) para lo que
    70|  el `friendship_status` de esa página no resolvió. Una pequeña pasada final tras el
  bucle recoge los casos sueltos de una comprobación por página que falló o fue
  limitada por rate limit. El progreso/estado ahora salen solo de `followingByPk.size`
  frente al total de following.
- `igListsApi.findUnclassifiedUserIds`: ahora también descarta cuentas con
  `followedBy === false` (un "no" explícito de Instagram) — solo `null` (de verdad
  desconocido) dispara una llamada a `show_many`, algo que importa mucho ahora que esto
  se ejecuta una vez por página en vez de una vez por escaneo.
- `realtimeMonitor.silentScan`: mismo cambio — lista de following + barrido `show_many`
  al final, sin paginación completa de followers.
