# Instagram Unfollowers PRO — Roadmap Maestro

> Objetivo: ser la **mejor herramienta de gestión de comunidad Instagram** del mundo, superando al competidor [davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers) en producto, confianza y descubrimiento.

**Versión actual:** v8.5.0  
**Rama activa de desarrollo:** `main`  
**Última actualización:** 2026-08-03

---

## 1. Por qué el competidor tiene más estrellas (y cómo ganarle)

| Factor | davidarroyo1234 (~4.7k ⭐) | Instagram Unfollowers PRO (EdvinCodes) |
|--------|---------------------------|----------------------------------------|
| **Antigüedad / SEO GitHub** | Repo original, nombre exacto del keyword | Fork/evolución PRO, menos backlinks históricos |
| **Fricción de uso** | Copiar script → consola → RUN (0 instalación) | ✅ Bookmarklet loader + extensión (paridad) |
| **Simplicidad percibida** | Una pantalla, un botón | Muchas features = curva de aprendizaje (mitigado con “3 Ways to Run”) |
| **Descubrimiento** | Topics + años de SEO | Landing + guías SEO + topics; falta Chrome Web Store live |
| **Confianza social** | 437 forks, comunidad larga | Menos PRs externos; open source + docs |
| **Producto real** | Solo unfollow manual | Ghost Score, PDF, i18n×16, historial, Growth (beta), PRO |

### Estrategia (estado)

1. ✅ Extensión PRO + **modo bookmarklet** con loader ligero
2. 🔄 SEO agresivo: FAQ schema, guías Ghost Score / bots; falta Store + más contenido
3. ✅ GitHub topics + README bilingüe + comparativa PRO vs básicos
4. 📋 Social proof / reviews Store — pendiente de submit
5. ✅ Diferenciadores en landing: Ghost Score, 16 idiomas, Growth, PDF
6. 🔄 No competir solo en estrellas — competir en Google + Store

---

## 2. Growth Engine — Plan de implementación

### Decisiones de producto (cerradas)

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Monetización | **PRO gratis temporalmente** | Lemon Squeezy rechazó el producto; ver `docs/PAYMENT_PROVIDERS.md` |
| Release Growth | **beta** hasta QA manual | Owner debe validar en Instagram real |
| SEO prioritario | **Landing + guías + README** | Keyword "instagram unfollowers" + long-tail |

### Fases Growth 0–5 ✅ (código)

Ver historial de commits `feature/growth-v2`. Checklist QA manual sigue pendiente (sección 5).

### Fase 6 — Crecimiento y competitividad ✅ (código + docs; Store pendiente humano)

- [x] Bookmarklet `loader.js` (~300 bytes)
- [x] Chrome Web Store **prep** (`docs/CHROME_WEB_STORE.md`)
- [x] GitHub topics
- [x] Comparativa landing
- [x] `llms.txt`
- [x] Landing UX (nav, 3 Ways to Run, pricing heading, Guides)
- [x] README ES/EN paridad v8.5
- [x] Code quality (eslint / tsc / vitest verdes)
- [x] Guías SEO: `ghost-score.html`, `detect-instagram-bots.html`
- [x] Docs analytics + payment (`docs/ANALYTICS.md`, `docs/PAYMENT_PROVIDERS.md`)
- [ ] **Chrome Web Store submit** (cuenta Dev + screenshots reales — owner)
- [ ] **QA manual Instagram** (owner)
- [ ] **Analytics live** (pegar script Plausible/Umami — owner)
- [ ] **Payment provider live** (cuenta Gumroad/Paddle — owner)

---

## 3. Hitos de producto

| Versión | Objetivo | Estado |
|---------|----------|--------|
| v8.3.0 | Performance landing + deploy CI + 16 idiomas | ✅ Released |
| v8.4.0-beta | Growth Engine PRO | ✅ Released |
| v8.5.0 | Bookmarklet loader + SEO guides + landing polish | ✅ Released |
| v8.6.0 | Licencias reales (nuevo payment provider) | 📋 Planificado |
| v9.0.0 | Cloud Sync estable + multi-cuenta UI | 📋 Planificado |

---

## 4. Deuda técnica conocida

| Item | Prioridad | Notas |
|------|-----------|-------|
| `useLicense` hardcodeado `isPro = true` | Alta | Reactivar antes de monetizar |
| Query hash GraphQL puede caducar | Media | Monitorizar 429 |
| `GrowthView` inline styles | Baja | Migrar a SCSS cuando estabilice |
| Sin E2E tests Instagram | Media | Checklist manual sección 5 |
| Tests unitarios solo en helpers | OK | API IG no mockeable fiable |

---

## 5. Checklist QA manual (Growth — owner)

1. [ ] Extensión → botón "Growth BETA" visible  
2. [ ] Disclaimer aparece y persiste  
3. [ ] Free (PRO off): Start bloqueado  
4. [ ] PRO: scraping 1 cuenta con posts recientes  
5. [ ] Comentaristas > 0  
6. [ ] Ghosts saltados  
7. [ ] Follow en historial (`YOU_FOLLOWED`)  
8. [ ] Pausa / reanudar / detener  
9. [ ] Límite diario 50  
10. [ ] i18n Growth  
11. [ ] `beforeunload` si growth activo  
12. [ ] Build producción OK  

---

## 6. Estructura Growth (v2)

```
src/
├── constants/growth.ts
├── model/growth-state.ts
├── utils/growthHelpers.ts (+ tests)
├── utils/growthApi.ts
├── hooks/useGrowth.ts
└── components/GrowthView.tsx
```

Landing SEO:

```
public/ghost-score.html
public/detect-instagram-bots.html
public/loader.js   # generado en build
scripts/generate-loader.js
```

---

## 7. Métricas de éxito (3 meses)

| Métrica | Objetivo |
|---------|----------|
| GitHub stars | 500+ |
| Visitas landing/día | +50% vs baseline |
| Retención extensión | Re-scan en 7 días |
| Growth adoption | 10% de sesiones PRO |
| Action blocks | < 1% sesiones Growth |

---

## 8. Preguntas abiertas — ✅ Resueltas

1. Lemon Squeezy → **no**; PRO gratis hasta nuevo provider.  
2. Growth → **beta** hasta QA.  
3. Bookmarklet primero → **hecho en v8.5**; Store siguiente (humano).

---

## 9. Próximos pasos (solo owner / humano)

1. **QA manual Instagram** (checklist §5)  
2. **Screenshots + submit Chrome Web Store** (`docs/CHROME_WEB_STORE.md`)  
3. **Cuenta Plausible/Umami** → pegar snippet (`docs/ANALYTICS.md`)  
4. **Gumroad/Paddle** cuando quieras cobrar (`docs/PAYMENT_PROVIDERS.md`)  

Todo lo automatizable en código/SEO/release de v8.5 está hecho.

---

*Actualizado en cada release. Rama: `main`.*
