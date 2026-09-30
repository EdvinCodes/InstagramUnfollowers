# Instagram Unfollowers PRO v9.0.1

A missing account no longer stops the pending-request queue. Scan classification is unchanged.

## English

- **One bad username no longer stops pending cancels.** Looking up a deleted or missing account can make `web_profile_info` answer 429. That user is skipped and the queue continues with the next one. A 404 is recorded as "account not found". The rate-limit stop remains only for the cancel action itself, after several failures in a row.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.0.1`

## Español

- **Un usuario malo ya no para la cancelación de solicitudes.** Buscar una cuenta borrada o que no existe puede hacer que `web_profile_info` responda 429. Ese usuario se omite y la cola sigue con el siguiente. Un 404 queda como "cuenta no encontrada". El aviso de límite de Instagram se queda solo para la cancelación en sí, después de varios fallos seguidos.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/)
