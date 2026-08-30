# Instagram Unfollowers PRO — Roadmap

> Visión: ser **la app de gestión de Instagram más completa** — no solo “quién no me sigue”, sino el centro local para **analizar, limpiar, proteger y hacer crecer** una cuenta, superando a [davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers) en producto, no solo en estrellas.

**Versión actual:** v8.8.0  
**Rama:** `main`  
**Última actualización:** 2026-08-30

---

## 1. Tesis de producto

El competidor gana en SEO histórico y simplicidad (un botón). Nosotros ganamos si somos **la suite**:

| Ellos | Nosotros |
|-------|----------|
| Scan + unfollow | Scan + unfollow + Ghost Score + PDF + 16 idiomas + historial |
| Solo API en vivo | **API en vivo + export de Meta** (rápido, 0 rate-limit) |
| Una acción | Colas lentas reutilizables: unfollow, remove, cancelar solicitud, mute, restrict… |
| Crecer a ciegas | Crecer **atado a higiene** (no re-solicitar, revisar a los 14 días) |

El caso de las **solicitudes pendientes** (v8.6) demostró el patrón ganador:

**Importar archivo de Meta → listar / seleccionar / A–Z → cola lenta tipo unfollow → guardar progreso en localStorage.**

Ese patrón se replica para casi toda la higiene de cuenta. Es más seguro, más completo y más diferenciador que inventar más bots.

### Lo que no haremos

- Pedir contraseña, 2FA ni servidor proxy
- Follows masivos tipo kamikaze como default
- Scraping de explore, DMs, story viewers agresivos
- Cualquier cosa que convierta la app en un bot de spam

Instagram mata eso. Nosotros somos **limpieza + inteligencia local + export de Meta**.

---

## 2. Estado actual (v8.8.0)

### Hecho

- [x] Scan de following / no-followers / mutuals (GraphQL en vivo)
- [x] Unfollow y soft-block (remove follower) con cola + pausa + 429
- [x] Ghost Score 0–100, filtros, CSV, PDF
- [x] Whitelist, historial, multi-cuenta por `ds_user_id`
- [x] Growth Engine (beta): follow a comentaristas de un nicho
- [x] Cancelar solicitudes **salientes** desde `pending_follow_requests.html`
- [x] Scan **offline** following vs followers desde el export de Meta (sin API)
- [x] Hub de home: Analizar / Limpiar / Crecer / Historial
- [x] Listas Meta de solo lectura (unfollowed, blocked, recent requests)
- [x] Diff entre dos exports de following/followers
- [x] Bookmarklet / Copy Script + extensión + CI → GitHub Pages
- [x] i18n 16 idiomas (EN/ES completos en la feature nueva; resto con fallback)
- [x] PRO temporalmente gratis (`PRO_PROMO_FREE`)

### Pendiente humano (no bloquea producto)

- [ ] QA manual Growth en Instagram real
- [ ] Submit Chrome Web Store
- [ ] Analytics live (Plausible/Umami)
- [ ] Payment provider (Gumroad/Paddle) — ver `docs/PAYMENT_PROVIDERS.md`

---

## 3. Arquitectura de la app completa (hub)

La home deja de ser “3 botones sueltos” y pasa a **cuatro módulos**:

```
Analizar          Limpiar              Crecer              Historial
─────────         ───────              ──────              ────────
Scan en vivo      Solicitudes out ✅   Growth beta         Time machine
Scan desde Meta   Solicitudes in       Revisión 7/14 días  Diff exports
Ghost Score       Inactivos            No re-solicitar     PDF salud
Dashboard         Bloqueados           Tope diario         Cloud sync
                  Mute / restrict
                  Soft-block
```

Cada acción de escritura reutiliza: **cola + timings de Settings + log a pantalla completa + persistencia**.

---

## 4. El filón Meta (misma infra que v8.6)

El export “Download your information” ya trae (y traerá) listas que hoy no usamos:

| Archivo / fuente | Feature | Fase |
|------------------|---------|------|
| `following.html` + `followers_*.html` | Scan **offline** following vs followers | 8.7 |
| Dos ZIPs de fechas distintas | **Diff** de comunidad (quién se fue, a quién seguiste) | 8.7 |
| `pending_follow_requests.html` | Cancelar solicitudes enviadas | ✅ 8.6 |
| Inbox de solicitudes **entrantes** (IG o export) | Denegar quién quiere seguirte | 8.8 |
| `recent_follow_requests.html` | Quién aceptó / ignoró lo que enviaste | 8.8 |
| `recently_unfollowed_profiles.html` | Cruce con historial de la app | 8.8 |
| `blocked_profiles.html` | Revisar / desbloquear en cola | 8.8 |
| Actividad (likes, comments, close friends, restricted) | Insights “nunca interactúa”, close friends, restrict | 8.9–9.x |

Parser compartido: `pendingRequestsParser.ts` se generaliza a `metaExportParser.ts`.

---

## 5. Hitos de producto

| Versión | Objetivo | Estado |
|---------|----------|--------|
| v8.3.0 | 16 idiomas + CI | ✅ |
| v8.4.0 | Growth Engine beta | ✅ |
| v8.5.0 | Bookmarklet + SEO | ✅ |
| v8.6.0 | Cancelar solicitudes salientes (Meta) | ✅ |
| **v8.7.0** | Scan offline from Meta export | ✅ |
| **v8.7.x** | Diff de dos exports | ✅ |
| **v8.8.0** | Home hub + listas Limpiar (unfollowed / blocked / recent) | ✅ |
| **v8.9** | Inactivos + mute/restrict + cola por antigüedad | 📋 |
| **v9.0** | Dashboard de salud + PDF antes/después | 📋 |
| **v9.1** | Growth atado a higiene (revisión 14 días, denylist) | 📋 |
| **v9.2** | Cloud sync real + UI multi-cuenta | 📋 |
| **v9.3** | Licencias reales + Chrome Web Store live | 📋 |
| **v10** | Suite “todo en uno”: insights de actividad Meta + automatizaciones seguras | 📋 Visión |

---

## 6. Fase 8.7 — Analizar sin tocar Instagram (máximo valor, mínimo riesgo)

El scan en vivo sigue existiendo. El export es el camino **rápido y seguro**.

- [x] Parser único para HTML/JSON de Meta (ES/EN y labels equivalentes)
- [x] Importar `following.html` + `followers_1.html` (y `followers_2…`)
- [x] Mismas pestañas que hoy: no-followers, mutuals, whitelist
- [ ] Ghost Score heurístico aunque no haya foto en vivo (username + nombre)
- [ ] Botón “Actualizar en vivo” opcional (GraphQL) para fotos y `follows_viewer` fresco
- [x] **Diff de dos exports:** el último following/followers se guarda; el próximo ZIP muestra quién se fue y a quién seguiste
- [x] Guardar snapshots del export en localStorage (como el scan actual)
- [x] Guía in-app: cómo pedir el ZIP a Meta (ya empezada en solicitudes)

**Por qué primero:** 0 Action Block, funciona con 50k following, te obliga a volver a la app cada vez que Meta genera un ZIP.

---

## 7. Fase 8.8 — Hub “Limpiar” (el resto de listas Meta)

Mismo UX que solicitudes pendientes: lista A–Z, seleccionar, log a pantalla completa.

- [ ] **Solicitudes entrantes** — denegar inbox (cuenta privada)
- [x] **Recent follow requests** — listar en solo lectura (sin cancelar por error a quien ya aceptó)
- [x] **Bloqueados** — listar (desbloquear en cola: pendiente)
- [x] **Recently unfollowed** — listar con fecha del export (cruce historial: pendiente)
- [x] Home: tarjeta “Limpiar” con solicitudes y otras listas + recuentos
- [x] i18n completo EN/ES; resto de locales con las claves nuevas (no solo fallback)

---

## 8. Fase 8.9 — Acciones más finas

No más “seguir gente”. Más **verbos** sobre la misma cola.

- [ ] Unfollow de **inactivos** (último post > N meses; N configurable)
- [ ] **Mute** stories / posts en vez de unfollow
- [ ] **Restrict**
- [ ] Quitar / añadir **close friends** (si el export o la API lo permiten)
- [ ] Cola ordenada por **antigüedad** (pendientes viejas primero)
- [ ] “No volver a solicitar” — denylist permanente (ya empezada en `ig_pending_cancelled_*`)
- [ ] Soft-block en lote desde el export de followers

Cada verbo = 1 endpoint + `useUnfollowerQueue` / `usePendingRequests` generalizado (`useActionQueue`).

---

## 9. Fase 9.0 — La app se siente completa

- [x] Home por módulos: **Analizar / Limpiar / Crecer / Historial**
- [ ] Dashboard: following, followers, no-followers, solicitudes abiertas, ghosts, tendencia
- [ ] PDF “antes / después” de una limpieza
- [ ] Ghost Score también en following y en pendientes
- [ ] Búsqueda, pestañas y log idénticos en todos los flujos (ya casi: unfollow = pendientes)
- [ ] Settings: un solo sitio para timings, tema, idioma, backups
- [ ] Vaciar progreso local de cada cola (reset consciente)

---

## 10. Fase 9.1 — Growth con sentido (sigue en beta hasta QA)

El motor de follows se **subordina** a la higiene.

- [ ] QA manual del checklist Growth (§14)
- [ ] Tras un follow: recordatorio / cola de revisión a los 7 y 14 días
- [ ] Si no te siguen → unfollow automático opcional (misma cola lenta)
- [ ] Nunca solicitar a alguien en denylist (cancelados, bloqueados, whitelist)
- [ ] Tope diario conservador visible; kamikaze escondido en expert
- [ ] Objetivos: cuentas semilla (ya) + más adelante hashtag **solo lectura** para candidatas
- [ ] Disclaimer y Action Block: no bajar la guardia

---

## 11. Fase 9.2–9.3 — Producto, no solo features

- [ ] Cloud sync real (historial + whitelist + progreso de colas + denylist)
- [ ] UI multi-cuenta (selector, no solo keys por cookie)
- [ ] Backup unificado (JSON) de todo lo local
- [ ] `PRO_PROMO_FREE = false` cuando haya provider
- [ ] Licencias + landing de pago
- [ ] Chrome Web Store + screenshots reales
- [ ] Analytics (Plausible/Umami)
- [ ] Copy Script de Pages siempre = `main` (ya lo hace el CI)

---

## 12. Fase 10 — Visión “todo”

Cuando el hub y Meta estén sólidos, el export de **actividad** abre el resto:

- Quién te sigue y **nunca** likea / comenta (si el ZIP lo trae)
- Hashtags que sigues
- Cuentas restringidas / ocultas
- Close friends vs following real
- Informe anual de comunidad
- Reglas: “si X y Y, entonces mute/unfollow” (siempre con confirmación y cola lenta)

Esto es v10: no se empieza hasta que 8.7–9.0 estén en producción y estables.

---

## 13. Competencia y descubrimiento

| Factor | Competidor (~4.7k ⭐) | Nosotros |
|--------|----------------------|----------|
| Fricción | Consola, 0 install | ✅ Copy Script + extensión |
| Producto | Unfollow | Suite (scan, ghosts, PDF, growth, Meta, limpieza) |
| Store | — | 📋 Submit pendiente |
| SEO | Años de keyword | Landing + 2 guías; faltan más páginas (cleaner, Meta export, inactivos) |

**SEO a escribir cuando existan las features:** `instagram-pending-requests.html`, `instagram-account-cleaner.html`, `instagram-meta-export.html`.

---

## 14. Deuda técnica

| Item | Prioridad | Notas |
|------|-----------|-------|
| Extraer `useActionQueue` (unfollow + pending + futuras) | Alta | Evitar copiar colas |
| Generalizar parser Meta | ✅ | `metaExportParser.ts` |
| `useLicense` / `PRO_PROMO_FREE` | Alta | Antes de cobrar |
| Query hash GraphQL puede caducar | Media | El scan Meta reduce la dependencia |
| Tests: parsers y colas, no la API de IG | Media | Ya hay tests de pending + friendship |
| i18n: no dejar features nuevas solo en EN/ES | Media | Cada módulo nuevo llena 16 locales |
| `GrowthView` inline styles | Baja | Cuando se toque el hub |
| E2E contra Instagram | No | Imposible de forma fiable; checklist manual |

---

## 15. Checklist QA Growth (owner)

1. [ ] Botón Growth visible  
2. [ ] Disclaimer persiste  
3. [ ] PRO off: Start bloqueado (cuando se reactive el paywall)  
4. [ ] Scraping 1 cuenta con posts recientes  
5. [ ] Comentaristas > 0  
6. [ ] Ghosts saltados  
7. [ ] Follow en historial (`YOU_FOLLOWED`)  
8. [ ] Pausa / reanudar / detener  
9. [ ] Límite diario  
10. [ ] `beforeunload` si hay cola activa  

---

## 16. Métricas (hacia la suite)

| Métrica | Objetivo |
|---------|----------|
| Quien usa **Limpiar** (Meta) vs solo Scan | > 30% de sesiones |
| Diff de 2º export en 90 días | Retención real |
| Action blocks en colas | < 1% sesiones |
| GitHub stars | 500+ |
| Store live | Sí |
| PRO de pago | Cuando el hub Limpiar esté estable |

---

## 17. Próximo paso concreto

El diff automático ya está. Siguiente valor: cruzar **recently unfollowed** con el historial de la app, o el hub visual Analizar / Limpiar.

Owner / humano en paralelo: Store, analytics, QA Growth, payment.

---

*Este documento es la fuente de verdad del producto. Actualizar en cada release.*
