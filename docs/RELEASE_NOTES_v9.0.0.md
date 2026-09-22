# Instagram Unfollowers PRO v9.0.0

A scan that did not finish both lists can no longer be mistaken for a finished one. Classification of a completed scan is unchanged.

## English

- **An interrupted scan stays off screen.** A rate limit, a network error, or a stop while the following list is still loading no longer publishes that partial list as non-followers. Results appear only after followers were actually checked (`completed` or `partial`). A blocked scan still stays hidden.
- **The silent monitor only alerts on a finished check.** It uses the same page-size setting and the same safety caps as the live scan. If either list stops early, comes back empty when the account is not empty, or the last follow-back sweep is rate-limited, it does not notify and it does not replace the saved snapshot. A check already in progress is not started again.
- **Protecting an account takes it out of the unfollow queue.** The avatar action now drops that person from the selection, the same way bulk protect already cleared it. "Select all" is checked only when the selection is exactly the rows on screen.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.0.0`

## Español

- **Un scan interrumpido no se muestra.** Un límite de Instagram, un error de red o una parada mientras aún se baja la lista de seguidos ya no publica esa lista a medias como no seguidores. Los resultados salen solo cuando los seguidores sí se comprobaron (`completed` o `partial`). Un scan bloqueado sigue sin mostrarse.
- **El monitor silencioso solo avisa si el chequeo terminó.** Usa el mismo tamaño de página y los mismos topes de seguridad que el scan en vivo. Si una lista se corta, vuelve vacía cuando la cuenta no lo está, o el último barrido de "te sigue" recibe un límite, no notifica y no sustituye la foto guardada. Un chequeo que ya está en curso no se vuelve a lanzar.
- **Proteger una cuenta la saca de la cola de unfollow.** El clic en el avatar la quita de la selección, igual que proteger en lote ya vaciaba la cola. "Todos" solo aparece marcado cuando la selección es exactamente la gente que se ve en pantalla.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/)
