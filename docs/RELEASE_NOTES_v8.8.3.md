# Instagram Unfollowers PRO v8.8.3

Follow-up to 8.8.2: the live scan listed accounts again, but marked **everyone** as a non-follower, and pending cancel still died on `web_profile_info` 429s.

## English

- **Mutuals / non-followers.** Following REST users often omit a joinable `pk` for followers, and `friendship_status.followed_by` was ignored. The scan now uses `followed_by` when Instagram sends it, matches followers by **any** id plus username, and if that still yields zero mutuals it bulk-checks `friendships/show_many/` instead of listing 500/500 as non-followers.
- **Pending cancel.** Stopped resolving each username through `web_profile_info` (the 429 you saw for a month). Lookup order: cached id → search your own following list → `usernameinfo` → the profile HTML (same as opening the account) → `web_profile_info` last. Extra `friendships/show` calls were removed so cancel can POST unfollow like Instagram's "Requested" button.

## Español

- **Mutuos / no seguidores.** El REST de following no siempre trae un id cruzable con followers, y se ignoraba `followed_by`. Ahora se usa esa flag, se cruza por cualquier id y por username, y si aun así sale 0 mutuos se consulta `show_many` en bloque.
- **Pendientes.** Ya no se resuelve cada usuario con `web_profile_info` (el 429 de siempre). Se busca id en caché, en tu lista following, `usernameinfo`, el HTML del perfil, y solo al final `web_profile_info`. Se quita el `friendships/show` extra para cancelar como en Instagram.
