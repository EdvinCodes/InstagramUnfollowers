# Instagram Unfollowers PRO v8.8.4

Follow-up to 8.8.3: the live scan still listed every account as a non-follower — this
time it was an ordering bug, not a matching bug.

## English

- **Everyone showing as a non-follower, again.** 8.8.3 fixed the *matching* logic, but
  the scan still fetched the **following** list first and the **followers** list second.
  While following was loading (which for large accounts can be most of the scan), the
  live view classified every account against an still-empty followers index — so it
  correctly showed 0 mutuals, but only because followers hadn't been fetched yet. The
  scan now loads **followers first**, so by the time following starts paginating, mutuals
  are already known and classified correctly from the first page.
- **`show_many` safety net now covers partial mismatches, not just total failure.** It
  previously only ran when the followers pass matched *zero* accounts. Now it runs
  whenever *any* following account is still unresolved after the followers pass — the
  same "friendship_status omitted + id mismatch" case, just narrower and more common
  than a full failure.
- **Added `rank_token` pagination.** Following/followers requests now echo back
  Instagram's `follow_ranking_token` on subsequent pages of the same list, matching what
  Instagram's own web client does to keep list ordering stable across pages.
- Real-time background monitor got the same followers-first ordering and safety net, so
  it no longer risks a false "new unfollower" notification for someone who still follows
  you back.

### Technical

- `useScanner`: swapped phase order (followers → following → `show_many` for the
  unresolved subset); added a symmetric "empty page but positive count" guard on the
  followers phase (mirrors the existing following-phase guard from 8.8.2).
- New `igListsApi.findUnclassifiedUserIds` / `parseRankToken`, unit tested; `fetchFollowingPage`
  / `fetchFollowersPage` now accept and return a `rankToken`.
- `realtimeMonitor.silentScan` reordered and given the same `show_many` safety net.

## Español

- **Todos seguían saliendo como no seguidores.** La 8.8.3 arregló el cruce de datos, pero
  el escaneo seguía cargando primero **following** y después **followers**. Mientras
  following cargaba (que en cuentas grandes es la mayor parte del escaneo), la vista en
  vivo clasificaba contra un índice de followers todavía vacío — por eso mostraba 0
  mutuos, pero solo porque followers aún no se había pedido. Ahora se carga **primero
  followers**, así que cuando empieza a paginar following, los mutuos ya se conocen y se
  clasifican bien desde la primera página.
- **La red de seguridad `show_many` ahora cubre coincidencias parciales, no solo el fallo
  total.** Antes solo se ejecutaba si followers no encontraba *ningún* mutuo. Ahora se
  ejecuta si *cualquier* cuenta de following queda sin resolver tras el cruce con
  followers — el mismo caso de "sin friendship_status + id que no cruza", pero más
  frecuente que un fallo total.
- **Se añade `rank_token` en la paginación.** Las peticiones a following/followers ahora
  reenvían el `follow_ranking_token` de Instagram en las páginas siguientes de la misma
  lista, igual que hace el propio cliente web de Instagram para mantener el orden estable.
- El monitor en tiempo real recibe el mismo orden (followers primero) y la misma red de
  seguridad, para no disparar una notificación falsa de "nuevo no seguidor".
