# KARSA Frontend

<img src="https://raw.githubusercontent.com/radhitchocs/karsa-frontend/main/public/faveicon.svg" width="72" alt="KARSA logo" />

Frontend Next.js untuk **KARSA** — platform presentasi interaktif berbahasa Indonesia.

KARSA memungkinkan peserta masuk ke sesi via kode atau QR tanpa perlu membuat akun.
Respons dikumpulkan secara real-time. Pada slide kelompok, server membagi peserta ke
dalam grup dan memvalidasi satu penjawab per kelompok. Tersedia kuis berskor dengan
timer dan leaderboard, serta fitur **Pancing Peserta** — presenter memilih satu peserta
secara acak dari yang sedang terhubung, dengan opsi exclude peserta yang sudah pernah
dipilih di slide yang sama.

- **Repo pasangan (backend):** https://github.com/radhitchocs/karsa-backend
- **Live product (frontend):** https://karsa-frontend.vercel.app/
- **Live backend:** https://ey3fd1lp8646-production-2ljnp1e5.australia-southeast1.suga.run
- **Demo video:** https://youtube.com/shorts/4d8b00FQk2M?feature=share

### Akun Demo untuk Pengujian Juri

Telah disediakan akun demo dengan beberapa data presentasi siap pakai untuk mempermudah evaluasi dan pengujian fitur:
- **Email:** `demo@karsa.id`
- **Password:** `demo1234`

---

## Package manager

**pnpm** (v12+)

```bash
corepack enable pnpm
```

## Setup

```bash
pnpm install
cp .env.local.example .env.local
# Edit .env.local jika perlu
pnpm dev
```

## Environment variables

| Variable | Default | Keterangan |
|----------|---------|-----------|
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Aktifkan MockSessionService dan SimulationControls |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL backend NestJS |

**Konfigurasi produksi:**
`NEXT_PUBLIC_DEMO_MODE=false` dengan
`NEXT_PUBLIC_API_URL=https://ey3fd1lp8646-production-2ljnp1e5.australia-southeast1.suga.run`

## DEMO_MODE — apa yang dilakukan MockSessionService

Saat `NEXT_PUBLIC_DEMO_MODE=true`, `MockSessionService` (`services/mock-session-service.ts`)
menggantikan `SessionService` yang terhubung ke backend nyata.

`MockSessionService` menjalankan seluruh domain engine (`execute`, `quizExecute`) dan
fungsi proyeksi (`projectForPresenter`, `projectForParticipant`, `projectForProjector`)
**sepenuhnya di dalam browser** — tanpa backend, tanpa Socket.IO. Data demo di-load
otomatis dari `domain/fixtures.ts`.

Komponen `SimulationControls` (hanya muncul saat DEMO_MODE) memungkinkan simulasi respons
peserta dan perpindahan peran (presenter / participant / projector) di dalam satu browser
tab, termasuk simulasi `pancing.pick`.

## Routes

| Route | Layar | Fase |
|-------|-------|------|
| `/` | S01 Daftar Presentasi | Phase 1 |
| `/login` | Login Presenter | Phase 6 |
| `/join` | S03 Gabung Sesi | Phase 2 |
| `/presentations/[id]/edit` | S02 Editor + S13 Editor Kuis | Phase 1 |
| `/session/[id]/presenter` | S04 Lobi, S05 Dashboard, S08, S11, S12, S14, S16 | Phase 2–5 |
| `/session/[id]/participant` | S07, S09, S10, S15, S16 | Phase 4 |
| `/session/[id]/projector` | S06, S15, S16 | Phase 3 |
| `/session/[id]/summary` | S12 Ringkasan | Phase 5 |

## Scripts

```bash
pnpm dev          # Dev server (http://localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
npx tsc --noEmit  # Typecheck
bash scripts/check-contracts.sh  # Verifikasi contracts/ identik dengan backend
```

## Contracts sync

`contracts/` harus identik dengan `../karsa-backend/src/contracts/`.
Jalankan `bash scripts/check-contracts.sh` sebelum commit jika mengubah contracts.

## Seed / data demo

Data demo di-load otomatis dari `domain/fixtures.ts` saat `NEXT_PUBLIC_DEMO_MODE=true`.
Tidak perlu seed terpisah untuk frontend demo.

---

## AI Use and Third-Party Declaration

### AI dalam produk

AI **tidak** digunakan di dalam produk. Tidak ada API AI, model, atau inferensi yang
dipanggil saat runtime.

Selama pengembangan, tim menggunakan asisten pengodean berbasis AI (Claude).

### Library dan framework pihak ketiga (dari `package.json`)

Lisensi diverifikasi dari `node_modules/<paket>/package.json`.

**Dependencies (runtime):**

| Package | Versi | Lisensi |
|---------|-------|---------|
| `next` | 16.4.0 | MIT |
| `react` | 19.3.0 | MIT |
| `react-dom` | 19.3.0 | MIT |
| `@tiptap/core` | 3.32.0 | MIT |
| `@tiptap/extensions` | 3.32.0 | MIT |
| `@tiptap/pm` | 3.32.0 | MIT |
| `@tiptap/react` | 3.32.0 | MIT |
| `@tiptap/starter-kit` | 3.32.0 | MIT |
| `@tiptap/static-renderer` | 3.32.0 | MIT |
| `@tanstack/react-query` | ^5.104.1 | MIT |
| `@base-ui/react` | ^1.8.0 | MIT |
| `@hookform/resolvers` | ^5.9.1 | MIT |
| `react-hook-form` | ^7.89.0 | MIT |
| `lucide-react` | ^1.54.0 | ISC |
| `socket.io-client` | ^4.8.4 | MIT |
| `zustand` | ^5.0.15 | MIT |
| `zod` | ^4.6.5 | MIT |
| `recharts` | ^3.10.1 | MIT |
| `d3-cloud` | 1.2.9 | BSD-3-Clause |
| `qrcode.react` | ^4.2.0 | ISC |
| `class-variance-authority` | ^0.7.1 | Apache-2.0 |
| `cn` | ^0.4.0 | MIT |
| `tw-animate-css` | ^1.4.0 | MIT |

**DevDependencies:**

| Package | Versi | Lisensi |
|---------|-------|---------|
| `tailwindcss` | ^4 | MIT |
| `typescript` | ^5 | Apache-2.0 |
| `eslint` | ^9 | MIT |
| `eslint-config-next` | 16.4.0 | MIT |
| `vitest` | ^5.0.3 | MIT |
| `@playwright/test` | ^1.64.0 | Apache-2.0 |
| `@axe-core/playwright` | ^4.13.0 | MPL-2.0 |
| `babel-plugin-react-compiler` | 1.0.0 | MIT |

### Aset eksternal

- **Font:** Plus Jakarta Sans via `next/font/google` (Google Fonts) — lisensi [OFL-1.1](https://scripts.sil.org/OFL)
- **Ikon:** `lucide-react` (ISC)
- **SVG di `public/`:** `vercel.svg`, `next.svg`, `globe.svg`, `window.svg`, `file.svg` berasal dari scaffolding default `create-next-app` dan tidak digunakan di halaman aplikasi. `faveicon.svg` adalah ikon aplikasi KARSA yang dibuat selama hackathon.
