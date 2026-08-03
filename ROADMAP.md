# Instagram Unfollowers PRO — Roadmap Maestro

> Objetivo: ser la **mejor herramienta de gestión de comunidad Instagram** del mundo, superando al competidor [davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers) en producto, confianza y descubrimiento.

**Versión actual:** v8.3.0  
**Rama activa de desarrollo:** `feature/growth-v2`  
**Última actualización:** 2026-08-03

---

## 1. Por qué el competidor tiene más estrellas (y cómo ganarle)

| Factor | davidarroyo1234 (~4.7k ⭐) | Instagram Unfollowers PRO (EdvinCodes) |
|--------|---------------------------|----------------------------------------|
| **Antigüedad / SEO GitHub** | Repo original, nombre exacto del keyword | Fork/evolución PRO, menos backlinks históricos |
| **Fricción de uso** | Copiar script → consola → RUN (0 instalación) | Extensión + landing (más pasos) |
| **Simplicidad percibida** | Una pantalla, un botón | Muchas features = curva de aprendizaje |
| **Descubrimiento** | Topics: `instagram-unfollowers`, README clásico | SEO mejorado recientemente, falta presencia en topics |
| **Confianza social** | 437 forks, comunidad larga | Menos PRs externos visibles |
| **Producto real** | Solo unfollow manual | Ghost Score, PDF, i18n×16, historial, Growth (WIP), PRO |

### Estrategia para superarlo (no copiar su debilidad)

1. **Mantener extensión PRO** como producto premium + ofrecer **modo bookmarklet** en landing (Fase 6) para usuarios que no quieren instalar nada.
2. **SEO agresivo:** comparativas honestas, blog posts, schema FAQ (ya iniciado), Chrome Web Store listing.
3. **GitHub visibility:** topics correctos, README bilingüe con GIFs, sección "Why PRO vs basic tools", badges de release.
4. **Social proof:** contador de usuarios, testimonios, changelog visible.
5. **Diferenciadores claros en landing:** Ghost Score 0-100, 16 idiomas, Growth Engine, PDF Health Report.
6. **No competir solo en estrellas:** competir en retención, valor percibido y búsqueda Google ("instagram unfollowers pro ghost score").

---

## 2. Growth Engine — Plan de implementación

Feature originada en `feature/growth-beta` (commit `fbfaf2c`). Reimplementación production-ready en `feature/growth-v2`.

### Qué hace

Automatiza **seguir usuarios que comentan** en cuentas objetivo de tu nicho (competidores, influencers del sector).

```
Setup → Scraping (posts 15d + comentaristas) → Following (con filtros anti-ban)
```

### Decisiones de producto (cerradas)

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Monetización | **PRO gratis temporalmente** | Lemon Squeezy rechazó el producto; buscando alternativa |
| Release Growth | **v8.4.0-beta** | Etiqueta beta hasta QA manual en Instagram real |
| SEO prioritario | **Landing + README + GitHub topics** | Competir con davidarroyo1234 en keyword "instagram unfollowers" |

---

### Fase 0 — Integración base ✅

- [x] Rama `feature/growth-v2` desde `main` actual
- [x] ROADMAP.md documentado
- [x] Merge limpio sin conflictos con `main.tsx`, `state.ts`
- [x] `npm run build` + `tsc --noEmit` + `npm test` verdes

### Fase 1 — Refactor y código compartido ✅

- [x] `src/constants/growth.ts` — límites, delays, storage keys
- [x] `src/utils/growthHelpers.ts` — lógica pura testeable
- [x] `src/utils/growthApi.ts` — API Instagram tipada
- [x] Reutilizar `isProfilePicAnonymous()` de `utils.ts`
- [x] Reutilizar `sleep()`, `getCookie()` de `utils.ts`
- [x] Anti-ban: jitter + pausa cada 5 follows (patrón `useUnfollowerQueue`)
- [x] Tests unitarios con Vitest (13 tests)

### Fase 2 — Lógica de negocio ✅

- [x] Skip si ya sigues / solicitud pendiente
- [x] Skip cuenta propia
- [x] Skip usuarios en whitelist
- [x] Detección ghost unificada (foto anónima + 0 posts via `isProfilePicAnonymous`)
- [x] Paginación comentarios (hasta 3 páginas/post)
- [x] Paginación posts en ventana 15 días
- [x] Dedup con `Set` (O(1))
- [x] Manejo 429 / rate-limit con backoff
- [x] Límite diario 50 follows
- [x] Historial: evento `YOU_FOLLOWED` en HistoryService
- [x] `isActiveProcess = true` durante growth activo
- [x] Auto-scroll consola de logs

### Fase 3 — i18n y UX ✅

- [x] ~65 claves `growth*` en `growthStrings.ts` + merge en 16 locales
- [x] `GrowthView.tsx` 100% con `t()`
- [x] Logs de `useGrowth` con `t()`

### Fase 4 — PRO gating y seguridad ✅

- [x] Free: botón Start bloqueado con mensaje PRO
- [x] PRO: ejecutar con límite diario
- [x] Kamikaze solo visible con checkbox "Modo experto"
- [x] Persistir aceptación disclaimer (`ig_growth_disclaimer_v1`)

### Fase 5 — Release v8.4.0-beta 🔄 En progreso

- [x] Bump versión 8.4.0-beta
- [x] SEO landing + README + sitemap actualizados
- [x] GitHub topics (instagram-unfollowers, etc.)
- [ ] QA manual checklist en Instagram real (owner)
- [ ] Release notes + dist.zip
- [ ] Merge `feature/growth-v2` → `main` + deploy Pages

### Fase 6 — Crecimiento y competitividad (post v8.4)

- [ ] **Bookmarklet mode** — script copiable estilo davidarroyo para usuarios sin extensión
- [ ] **Chrome Web Store** — listing optimizado con screenshots
- [ ] **GitHub topics** — `instagram`, `instagram-unfollowers`, `social-media-tools`
- [ ] **Comparativa landing** — tabla PRO vs herramientas básicas (sin nombrar agresivamente)
- [ ] **Blog / docs** — "Cómo detectar bots en Instagram", "Ghost Score explicado"
- [ ] **Analytics privados** — Plausible/Umami en landing (sin trackers invasivos)
- [ ] **Referral / Ko-fi** — ya existe botón; medir conversión

---

## 3. Hitos de producto (más allá de Growth)

| Versión | Objetivo | Estado |
|---------|----------|--------|
| v8.3.0 | Performance landing + deploy CI + 16 idiomas | ✅ Released |
| v8.4.0 | Growth Engine PRO | 🔄 En desarrollo |
| v8.5.0 | Bookmarklet + onboarding simplificado | 📋 Planificado |
| v8.6.0 | Reactivar Lemon Squeezy / licencias reales | 📋 Planificado |
| v9.0.0 | Cloud Sync estable + multi-cuenta UI | 📋 Planificado |

---

## 4. Deuda técnica conocida

| Item | Prioridad | Notas |
|------|-----------|-------|
| `useLicense` hardcodeado `isPro = true` | Alta | Reactivar validación real antes de monetizar Growth |
| Query hash GraphQL puede caducar | Media | Monitorizar errores 429 en scanner |
| `GrowthView` inline styles | Baja | Migrar a SCSS cuando estabilice |
| Sin E2E tests Instagram | Media | Imposible en CI; checklist manual documentado |
| Tests unitarios solo en helpers | OK | API de IG no mockeable de forma fiable |

---

## 5. Checklist QA manual (pre-release Growth)

Ejecutar en cuenta de prueba de Instagram:

1. [ ] Abrir extensión → botón "Growth BETA" visible
2. [ ] Disclaimer aparece y persiste tras aceptar
3. [ ] Free user (desactivar PRO): Start bloqueado
4. [ ] PRO user: scraping de 1 cuenta objetivo con posts recientes
5. [ ] Comentaristas extraídos > 0
6. [ ] Ghosts saltados correctamente
7. [ ] Follow exitoso registrado en historial (`YOU_FOLLOWED`)
8. [ ] Pausa / reanudar / detener funcionan
9. [ ] Límite diario bloquea tras 50 follows
10. [ ] Cambio de idioma traduce toda la UI Growth
11. [ ] `beforeunload` avisa si growth activo
12. [ ] Build producción sin errores

---

## 6. Estructura de archivos Growth (v2)

```
src/
├── constants/growth.ts          # Límites, delays, storage keys
├── model/growth-state.ts        # GrowthState type
├── utils/growthHelpers.ts       # Lógica pura (+ tests)
├── utils/growthHelpers.test.ts
├── utils/growthApi.ts           # Fetch Instagram API
├── hooks/useGrowth.ts           # Orquestación
└── components/GrowthView.tsx    # UI completa
```

---

## 7. Métricas de éxito

| Métrica | Objetivo 3 meses |
|---------|------------------|
| GitHub stars | 500+ (crecimiento orgánico) |
| Visitas landing/día | +50% vs baseline |
| Retención extensión | Usuarios que vuelven a escanear en 7 días |
| Growth adoption (PRO) | 10% de usuarios PRO lo prueban |
| Action blocks reportados | < 1% de sesiones Growth |

---

## 8. Preguntas abiertas para el product owner

1. **¿Reactivamos licencias Lemon Squeezy antes del release v8.4?** (actualmente PRO está desbloqueado para todos)
2. **¿Publicamos Growth en release notes como "beta" o "stable"?**
3. **¿Quieres bookmarklet en v8.5 o priorizamos Chrome Web Store primero?**

---

*Este documento se actualiza en cada fase completada. Commits relacionados: `feature/growth-v2`.*
