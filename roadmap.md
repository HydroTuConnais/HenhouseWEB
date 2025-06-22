# Roadmap “Build & Ship” — Front‑end **Next.js 14** (App Router)

*(Document à remettre tel quel à l’équipe **WinSurf / DevOps** pour industrialisation – Juin 2025)*  

---

## 1. Contexte

| Élément | Choix retenu |
|---------|--------------|
| **Back‑end** | API REST Adonis (`/auth`, `/api/...`) |
| **Front‑end** | Next.js 14, TypeScript, App Router |
| **Design System** | Tailwind CSS + shadcn/ui |
| **Data Layer** | TanStack Query + Axios |
| **State local** | Zustand (panier) |
| **Auth** | next‑auth (JWT Credentials, cookie HttpOnly) |
| **Tests** | Vitest & Testing‑Library (unit) – Playwright (e2e) |
| **Package‑manager** | pnpm |

---

## 2. Planning synthétique

| Semaine | Livrable clé | Tag Git |
|---------|--------------|---------|
| 0 | Skeleton + quality gate | `v0.2.0` |
| 1 | Providers TanStack & Axios client | `v0.3.0` |
| 2 | Auth flow complet | `v0.4.0` |
| 3‑4 | Pages **Menus** & **Produits** | `v0.6.0` |
| 5 | Panier + Checkout + tests verts | `v0.8.0` |
| 6 | Build prod + Docker OK | `v1.0.0-rc` |
| 7 | Déploiement staging + doc WinSurf | `v1.0.0` |

---

## 3. Phase 0 — Bootstrap projet *(Jour 0)*

| Étape | Commande / action | Sortie / artefact |
|-------|-------------------|-------------------|
| **Init repo** | `pnpm create next-app@latest winsurf-frontend \`<br>`  --ts --tailwind --eslint --app --src-dir --import-alias "@/*"` | Monorepo **winsurf‑frontend** |
| **Nettoyage** | Supprimer `/api/hello`, créer `app/(public)` | Skeleton App Router |
| **Commit #1** | “chore: bootstrap Next14 project” | tag `v0.1.0` |

---

## 4. Phase 1 — Qualité & convention *(Jour 1‑2)*

1. **ESLint + Prettier + type‑check**  
   ```bash
   pnpm add -D eslint-config-next@latest prettier eslint-plugin-tailwindcss
   pnpm lint ; pnpm type-check
   ```
2. **Husky & lint‑staged**  
   ```bash
   pnpm dlx husky-init && pnpm add -D lint-staged
   ```
3. **CI quality-gate (GitHub Actions)** – job `quality.yml` : install pnpm → `lint` → `type-check`.

---

## 5. Phase 2 — Foundation code *(Semaine 1)*

| Étape | Dossier/fichier | Détails |
|-------|-----------------|---------|
| **Variables d’env.** | `.env.example` (`NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, …) | |
| **Client Axios** | `lib/http.ts` | Interceptor 401 → `signOut()` |
| **Provider Query** | `app/providers/tanstack-provider.tsx` | `QueryClient` + `Hydrate` |
| **Layouts racine** | `app/(public)/layout.tsx`, `app/(dashboard)/layout.tsx` | rendu conditionnel session |

---

## 6. Phase 3 — Auth *(Semaine 2)*

1. `pnpm add next-auth axios`  
2. Route handler : `/app/api/auth/[...nextauth]/route.ts` (credentials → `/auth/login`).  
3. `middleware.ts` protège `/dashboard/*`, `/cart`, `/orders/*`.  
4. Page `/login` (formulaire + `useSession()`).

---

## 7. Phase 4 — Ressources métier *(Semaines 3‑4)*

| Ressource | Pages / Segments | Hook TanStack |
|-----------|------------------|---------------|
| **Menus** | `/menus` (grid), `/menus/[id]` (détail) | `useMenus`, `useMenu(id)` |
| **Produits** | `/produits` (+ filtre `?menuId=`) | `useProduits` |
| **Panier** | `<CartSheet>` accessible globalement + `/cart` | Zustand persist |
| **Commandes** | `/checkout` (POST `/api/commandes`) ; `/orders/[id]` (suivi) | `useOrder(id)` |
| **Entreprises** (admin) | `(admin)/entreprises/*` | CRUD hooks |

> **Convention** : composants réutilisables dans `components/`, fetch RSC dans segments.

---

## 8. Phase 5 — Tests *(Semaine 5)*

| Niveau | Outil | Script |
|--------|-------|--------|
| Unitaire & hooks | **Vitest** | `pnpm test` |
| UI Component | **@testing-library/react** | Couverture ≥ 80 % |
| End‑to‑end | **Playwright** (stub API) | `pnpm e2e` |

CI `build.yml` : lint → type → unit → build → e2e-headless.

---

## 9. Phase 6 — Build production *(Semaine 6)*

1. `pnpm build` → `.next` + `public/`.  
2. **Analyse bundle** : `pnpm dlx nextjs-bundle-analysis`.  
3. **Docker** (alternative Vercel) :  
   ```dockerfile
   FROM node:20-alpine AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN corepack enable && pnpm i --prod --frozen-lockfile

   FROM node:20-alpine AS runner
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN pnpm build
   EXPOSE 3000
   CMD ["pnpm","start"]
   ```
---

## 10. Phase 7 — Déploiement & livraison *(Semaine 7)*

| Cible | Pipeline | Variables nécessaires |
|-------|----------|-----------------------|
| **Vercel** | Connect repo → auto deploy | `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL` |
| **Kubernetes** | GitHub Actions → build Docker → push ECR → helm upgrade | via `configMap` |
| **WinSurf IDE** | Importer repo + fichiers pipeline | — |

---

## 11. Fichiers obligatoires à transmettre

| Fichier | Fonction |
|---------|----------|
| `README.md` | Setup local (`pnpm dev`), conventions dossiers |
| `roadmap_build.md` | **(ce document)** |
| `.github/workflows/quality.yml` | lint + type + tests |
| `.github/workflows/build.yml` | build + publish artefact / Docker |
| `Dockerfile` | Build container |
| `.env.example` | Variables d’environnement de référence |

---

## 12. Check‑list finale avant remise WinSurf

- [ ] Scripts PNPM **OK** : `lint`, `type-check`, `test`, `build`.  
- [ ] Tag **`v1.0.0`** poussé + release notes.  
- [ ] CI verte sur `main`.  
- [ ] Image Docker `winsurf-frontend:1.0.0` dispo sur registry.  
- [ ] Documentation Build & Run complète dans `README.md`.

---

> **Livrez le dépôt accompagné de _roadmap_build.md_ ; l’équipe WinSurf pourra builder, tester et déployer sans friction.**  
