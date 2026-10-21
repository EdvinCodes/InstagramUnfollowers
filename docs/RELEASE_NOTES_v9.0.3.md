# Instagram Unfollowers PRO v9.0.3

Unfollow and cancelling a pending request now use the same GraphQL mutation as Instagram's own Unfollow button.

## English

- **`/api/v1/friendships/destroy/` does not unfollow on the web.** Instagram answers that route with the instagram.com HTML page and HTTP 200, so a 200 was never proof the account was dropped.
- **Unfollow and cancel-request call `usePolarisUnfollowMutation`.** Session tokens (`fb_dtsg`, `lsd`) are read from the page. Success counts only when Instagram's response or a fresh profile check shows the follow or outgoing request is gone.

### Install

1. Download `dist.zip` below → Load unpacked in `chrome://extensions`
2. Or use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.0.3`

## Español

- **`/api/v1/friendships/destroy/` no deja de seguir en la web.** Instagram responde con el HTML de instagram.com y un 200, así que ese 200 no demostraba que la cuenta se hubiera quitado.
- **Dejar de seguir y cancelar una solicitud llaman a `usePolarisUnfollowMutation`.** Los tokens de sesión (`fb_dtsg`, `lsd`) se leen de la página. Solo cuenta como éxito cuando la respuesta o una comprobación del perfil dicen que el follow o la solicitud ya no están.

### Instalar

1. Descarga `dist.zip` → Cargar descomprimida en `chrome://extensions`
2. O usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/) cuando Pages publique `content.js?v=9.0.3`
