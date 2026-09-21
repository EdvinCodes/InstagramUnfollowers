# Instagram Unfollowers PRO v8.8.7

Hotfix for a regression introduced in 8.8.6: real mutuals could get stuck permanently
in the "non-follower" tab.

## English

- **Mutuals stuck in "Non-followers".** 8.8.6 skipped the `show_many` verification
  step for any account where Instagram's following-list `friendship_status` already
  said `followed_by: false`, on the assumption that a `false` was just as trustworthy
  as a `true`. It isn't: that flag can be stale or simply wrong on the *following*
  list, and once skipped, nothing ever re-checked it — a real mutual reported as
  `false` there stayed misclassified as a non-follower for the rest of the scan (and
  in the final results), not just for a second or two.
- **Fix: verify everyone, trust only a confirmed `true`.** `show_many` now runs for
    10|  every account that isn't already confirmed as following back — regardless of
  whether the list said `false` or omitted the field entirely. This costs a few more
  requests on accounts where Instagram's list data happens to be accurate, in exchange
  for never silently trusting a negative that turned out not to be reliable.

### Technical

- `igListsApi.findUnclassifiedUserIds`: removed the `followedBy !== false` short
  circuit added in 8.8.6. Only `restUserFollowsViewer` (confirmed `true`, a followers-
  index hit, or an earlier `show_many` match) counts as "already resolved" now.
- Added a regression test locking this in: an account with `followedBy: false` must
    20|  still appear in the `show_many` candidate list.

## Español

- **Mutuos atascados en "No seguidores".** La 8.8.6 se saltaba la verificación por
  `show_many` para cualquier cuenta cuyo `friendship_status` en la lista de following ya
  dijera `followed_by: false`, asumiendo que un `false` era tan fiable como un `true`.
  No lo es: ese dato puede estar desactualizado o simplemente equivocado en la lista de
  *following*, y al saltárselo, nada volvía a comprobarlo — un mutuo real marcado como
  `false` ahí se quedaba mal clasificado como no seguidor el resto del escaneo (y en el
  resultado final), no solo un par de segundos.
    30|- **Arreglo: verificar a todos, confiar solo en un `true` confirmado.** `show_many`
  ahora se ejecuta para cualquier cuenta que no esté ya confirmada como que te sigue de
  vuelta, sin importar si la lista decía `false` o no traía el dato. Cuesta alguna
  petición extra en cuentas donde el dato de Instagram sí era correcto, a cambio de no
  confiar nunca en un "no" que resultó no ser fiable.

### Technical

- `igListsApi.findUnclassifiedUserIds`: se elimina el atajo `followedBy !== false`
  añadido en la 8.8.6. Ahora solo cuenta como "ya resuelto" lo que confirme
  `restUserFollowsViewer` (un `true` confirmado, coincidencia en el índice de followers,
    40|  o un `show_many` anterior).
- Se añade un test de regresión: una cuenta con `followedBy: false` debe seguir
  apareciendo en la lista de candidatos para `show_many`.
