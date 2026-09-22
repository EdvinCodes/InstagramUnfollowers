# Instagram Unfollowers PRO v8.8.10

Hardens the live scan without touching how following and followers are classified. Growth stays in beta.

## English

- **A blocked scan no longer lists everyone as a non-follower.** If followers never resolve, the results stay off screen instead of a misleading full list. The same decisions (duplicate accounts, a stale `followed_by: false`, partial vs blocked) now have tests.
- **The background monitor uses your page size.** Lowering users-per-cycle in Settings also applies to the silent 30-minute check. The list request itself refuses a count outside 10–100.
- **PRO stays open during the payment migration.** A saved license key can no longer flip the app back to upgrade locks while the banner says everything is free. Ghost Score and multi-unfollow stay available. The paywall copy remains for when the promo ends.
- **Multi-unfollow uses the in-app toast** instead of a blocking browser alert.
- **Shorter “No photo” label** on the Smart Select button, so the grid doesn’t wrap on a phone.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=8.8.10`

## Español

- **Un scan bloqueado ya no lista a todo el mundo como no seguidor.** Si followers no se resuelve, los resultados no se muestran. Las mismas decisiones (cuentas repetidas, un `followed_by: false` viejo, parcial o bloqueado) ahora tienen tests.
- **El monitor en segundo plano usa tu tamaño de página.** Bajar los usuarios por ciclo en Ajustes también vale para el chequeo silencioso. La petición rechaza un `count` fuera de 10–100.
- **PRO sigue abierto mientras migramos el pago.** Una licencia guardada ya no puede volver a poner los candados de “mejora” mientras el aviso dice que todo es gratis. Ghost Score y el unfollow múltiple siguen disponibles. Los textos del paywall se quedan para cuando acabe la promo.
- **El unfollow múltiple usa el toast** de la app, no un `alert` que congela la pestaña.
- **Etiqueta corta “Sin foto”** en la selección inteligente, para que el botón no se parta en el móvil.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/)
