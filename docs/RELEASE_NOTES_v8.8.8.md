# Instagram Unfollowers PRO v8.8.8

Full rewrite of the live scan's classification logic (issue #5), rebuilt against
[davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers) — the fork this project
originally started from, which had already solved the same "Instagram broke our follow-back signal" problem the
simple, reliable way. Also adds the in-app heads-up this fix needed, plus a few small quality-of-life pieces from
that fork.

## English

- **Mutuals showing as non-followers — for good this time.** 8.8.6/8.8.7 tried to keep the "sorts as it loads" feel
  by asking Instagram's `friendship_status`/`show_many` whether each account followed back. Both signals turned out
  to be unreliable on real accounts (one omits data on large accounts, the other can answer an outright wrong
    10|  `false`) — either way, real mutuals could get stuck misclassified with nothing left to correct them. The scan
  now does what davidarroyo1234's fork does: fetch your **entire** following list, then your **entire** followers
  list, cross-reference the two id sets once, and only then classify anyone. `show_many` still runs, but only
  afterwards, as a last-resort sweep for whatever the followers list itself couldn't resolve — never the primary
  signal again.
- **New heads-up banner.** Because nothing is classified until both lists are fully in, a banner now sits at the
  top of the results while a scan is running, explaining that accounts won't appear or sort into Mutuals /
  Non-followers until the scan fully finishes. This is the same expectation davidarroyo1234's README sets for its
  users — now said inside the app instead of assumed.
    20|- **Your timing settings now survive a reload.** Previously they silently reset to defaults every time the page
  reloaded unless you'd exported a settings backup. They're now saved automatically, like the reference fork does.
- **A little more anti-ban jitter.** A small random micro-pause plus a jittered (not fixed) long cooldown every 5
  pages, matching the pacing davidarroyo1234's fork uses.
- **Avatar hover preview.** Hovering an avatar in the results list now shows a larger preview, another small piece
  borrowed from the reference fork.
- If the followers list (or the final sweep) doesn't fully load, the scan no longer treats that silently as a full
  success — results are still shown, but flagged so a new toast can tell you some accounts might be misclassified,
  and it won't get treated as a trustworthy baseline for "new unfollower" alerts.

### Technical

- `useScanner`: replaced the per-page `show_many`/`friendship_status` classification with three sequential phases —
    30|  paginate following (0-50%), paginate followers (50-95%), cross-reference + one `show_many` sweep for stragglers
  (95-100%) — with a single `setScannerState` write for `results`, instead of one per page. New `'partial'`
  `ScanFinishReason` for "following succeeded, followers/sweep didn't fully resolve".
- `realtimeMonitor.silentScan`: same restructure — full followers pagination restored before classifying, so the
  background monitor doesn't risk a false "new unfollower" alert either.
- `igListsApi.findUnclassifiedUserIds`/`restUserFollowsViewer` unchanged — the fix was in when/how often they're
  called, not their logic (already hardened in 8.8.7).
- New `uxStrings.ts` keys: `scanProgressBannerTitle`/`Body`, `statusPhaseFollowing`/`Followers`, `statusClassifying`,
    40|  `scanPartialFollowersToast` — all 16 locales.
- New `loadTimings`/`saveTimings` in `utils.ts` (per-account key via `getDynamicStorageKey`, same pattern as the
  whitelist), wired into `main.tsx`.
- `UserAvatar.tsx`: hover preview renders via `position: fixed` so it escapes the row's `overflow: hidden` circular
  avatar crop.

## Español

- **Mutuos apareciendo como no seguidores — arreglado de verdad esta vez.** Las versiones 8.8.6/8.8.7 intentaban
  mantener la sensación de "clasifica mientras carga" preguntándole a Instagram vía `friendship_status`/`show_many`
  si cada cuenta te seguía de vuelta. Las dos señales resultaron poco fiables en cuentas reales (una omite datos en
    50|  cuentas grandes, la otra puede responder un `false` directamente equivocado) — en ambos casos, mutuos reales
  podían quedar mal clasificados sin nada que los corrigiera después. El escaneo ahora hace lo mismo que el fork de
  davidarroyo1234: pide tu lista **completa** de following, luego tu lista **completa** de followers, cruza los dos
  conjuntos de IDs una vez, y solo entonces clasifica a cualquiera. `show_many` sigue usándose, pero solo después,
  como barrido de último recurso para lo que la lista de followers no pudo resolver por sí sola — nunca vuelve a ser
  la señal principal.
- **Nuevo aviso superior.** Como ya no se clasifica nada hasta que ambas listas están completas, ahora aparece un
  aviso en la parte superior de los resultados mientras el escaneo corre, explicando que las cuentas no aparecerán
  ni se ordenarán en Mutuos / No seguidores hasta que el escaneo termine del todo. Es la misma expectativa que el
    60|  README del fork de davidarroyo1234 pone a sus usuarios — ahora dicha dentro de la propia app.
- **Tu configuración de tiempos ahora sobrevive a una recarga.** Antes se reiniciaba a los valores por defecto cada
  vez que la página se recargaba, salvo que hubieras exportado un backup. Ahora se guarda automáticamente, como hace
  el fork de referencia.
- **Un poco más de aleatoriedad anti-baneo.** Una micro-pausa aleatoria más un enfriamiento largo variable (no fijo)
  cada 5 páginas, igual que el ritmo que usa el fork de davidarroyo1234.
- **Vista previa del avatar al pasar el ratón.** Pasar el cursor sobre un avatar en la lista de resultados ahora
  muestra una vista previa más grande, otro detalle prestado del fork de referencia.
- Si la lista de followers (o el barrido final) no carga del todo, el escaneo ya no lo trata en silencio como un
    70|  éxito completo — los resultados se siguen mostrando, pero se marcan para que un nuevo aviso te diga que algunas
  cuentas podrían estar mal clasificadas, y no se usan como base fiable para las alertas de "nuevo no seguidor".

### Technical

- `useScanner`: se sustituye la clasificación por página vía `show_many`/`friendship_status` por tres fases
  secuenciales — paginar following (0-50%), paginar followers (50-95%), cruzar datos + un barrido `show_many` para
  los sueltos (95-100%) — con una sola escritura de `results` en `setScannerState`, en vez de una por página. Nuevo
  `ScanFinishReason` `'partial'` para "following salió bien, followers/barrido no se resolvió del todo".
- `realtimeMonitor.silentScan`: misma reestructuración — se restaura la paginación completa de followers antes de
  clasificar, para que el monitor en segundo plano tampoco arriesgue una alerta falsa de "nuevo no seguidor".
    80|- `igListsApi.findUnclassifiedUserIds`/`restUserFollowsViewer` sin cambios — el arreglo estaba en cuándo y con qué
  frecuencia se llaman, no en su lógica (ya reforzada en la 8.8.7).
- Nuevas claves en `uxStrings.ts`: `scanProgressBannerTitle`/`Body`, `statusPhaseFollowing`/`Followers`,
  `statusClassifying`, `scanPartialFollowersToast` — en los 16 idiomas.
- Nuevo `loadTimings`/`saveTimings` en `utils.ts` (clave por cuenta vía `getDynamicStorageKey`, mismo patrón que la
  whitelist), conectado en `main.tsx`.
- `UserAvatar.tsx`: la vista previa al hover se renderiza con `position: fixed` para escapar del recorte circular
  `overflow: hidden` de la fila.
