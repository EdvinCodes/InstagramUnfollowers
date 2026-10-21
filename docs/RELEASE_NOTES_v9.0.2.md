# Instagram Unfollowers PRO v9.0.2

Instagram removed `POST /web/friendships/{id}/unfollow/` (it now returns 404). The replacement call can answer 200 without unfollowing. This release only counts an unfollow when the profile is no longer followed.

## English

- **Unfollow no longer calls the retired `/web/friendships/.../unfollow/` route.** Follow, unfollow, remove-follower and cancel-request use `/api/v1/friendships/`.
- **A 200 is not treated as success by itself.** The queue checks the profile afterwards. If Instagram answers OK and the account is still followed, that row is a failure and the queue stops instead of marking everyone completed.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.0.2`

## Español

- **Dejar de seguir ya no llama a `/web/friendships/.../unfollow/`, que ahora responde 404.** Seguir, dejar de seguir, quitar seguidor y cancelar solicitud usan `/api/v1/friendships/`.
- **Un 200 ya no cuenta como éxito por sí solo.** La cola comprueba el perfil después. Si Instagram responde OK y sigues a esa cuenta, esa fila es un fallo y la cola se detiene, en vez de marcar a todo el mundo como completado.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/) cuando Pages publique `content.js?v=9.0.2`
