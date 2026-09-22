# Instagram Unfollowers PRO v8.8.9

GitHub Releases last shipped **v8.8.1**. This tag includes everything since then: the live-scan repair for [issue #5](https://github.com/EdvinCodes/InstagramUnfollowers/issues/5), and the scan controls ported from davidarroyo1234 without replacing that classification.

## English

### Live scan (8.8.2 – 8.8.8)

- **Results show up again.** Instagram's old GraphQL following query started returning an empty `edges` array. The scan now uses the same REST lists Instagram's web app uses, keeps `rank_token`, and refuses to treat a suspiciously empty first page as success.
- **Classification waits until both lists are in.** Following is fetched, then followers, then the two id sets are cross-referenced once. `show_many` only sweeps accounts the followers list could not resolve. Mutuals are no longer stuck as non-followers because a stale `followed_by: false` was trusted.
- **You see why the list is empty at first.** A banner explains that accounts appear after both lists finish. On a large account that can take a few minutes. The offline Meta scan is still the instant path.

### This release

- **Users per cycle.** Settings can set how many accounts each page asks for (10–100, default 50).
- **Smart Select.** Verified, private, no profile photo, and ghosts. Ghosts selects only ghost and bot (score 45+). Suspicious accounts stay out of the unfollow queue.
- **Protect in bulk writes history once.** Selecting hundreds of accounts and protecting them no longer rewrites `localStorage` once per account.
- **Summary matches the tabs.** Non-followers and mutuals use the same follow-back check as the tabs and leave protected accounts out. The ghost total is ghost + bot only.
- **Sticky unfollow bar** and the cooldown status shows the real seconds remaining.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) Copy Script / bookmarklet (`content.js?v=8.8.9` after Pages deploys)

## Español

### Scan en vivo (8.8.2 – 8.8.8)

- **Los resultados vuelven a salir.** La query GraphQL vieja empezó a devolver `edges` vacío. El scan usa las listas REST de la web de Instagram, conserva `rank_token` y no trata una primera página vacía sospechosa como éxito.
- **La clasificación espera a las dos listas.** Primero following, luego followers, y se cruzan los ids una sola vez. `show_many` solo barre lo que la lista de followers no pudo resolver. Un `followed_by: false` viejo ya no deja mutuos clavados en no seguidores.
- **El aviso explica la espera.** Las cuentas aparecen cuando el cruce termina. En cuentas grandes tarda unos minutos. El scan offline de Meta sigue siendo el camino instantáneo.

### Esta versión

- **Usuarios por ciclo.** En Ajustes, cada página pide entre 10 y 100 cuentas (50 por defecto).
- **Selección inteligente.** Verificadas, privadas, sin foto y fantasmas. Fantasmas marca solo ghost y bot (puntuación 45+). Las sospechosas no entran en la cola de unfollow.
- **Proteger en lote escribe el historial una vez.** Cientos de cuentas ya no reescriben `localStorage` una por una.
- **El resumen coincide con las pestañas.** No seguidores y mutuos usan la misma comprobación y dejan fuera la whitelist. El total de fantasmas es solo ghost + bot.
- **Barra de unfollow fija** y el enfriamiento muestra los segundos que quedan.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/)
