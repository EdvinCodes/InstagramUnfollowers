# Instagram Unfollowers PRO v9.0.4

Unfollow no longer calls `web_profile_info` before the action. That lookup was returning 429 after a scan and stopping the queue before Instagram's Unfollow button ran.

## English

- The scan already has each account's id. Unfollow sends that id to `usePolarisUnfollowMutation`.
- A 429 from `web_profile_info` is no longer part of unfollow. Confirmation uses the mutation response and a search of your following list.

### Install

1. Use the [landing page](https://edvincodes.github.io/InstagramUnfollowers/) once Pages deploys `content.js?v=9.0.4`

## Español

- El escaneo ya trae el id de cada cuenta. Dejar de seguir manda ese id a `usePolarisUnfollowMutation`.
- Un 429 de `web_profile_info` ya no forma parte del unfollow. La comprobación usa la respuesta de la mutación y una búsqueda en tu lista de seguidos.

### Instalar

1. Usa la [página oficial](https://edvincodes.github.io/InstagramUnfollowers/) cuando Pages publique `content.js?v=9.0.4`
