# mockup-karsa-frontend

Frontend mockup untuk Karsa — platform presentasi interaktif berbahasa Indonesia.

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

`contracts/` harus identik dengan `../mockup-karsa-backend/src/contracts/`.
Jalankan `bash scripts/check-contracts.sh` sebelum commit jika mengubah contracts.

## Seed / data demo

Data demo di-load otomatis dari `domain/fixtures.ts` saat `NEXT_PUBLIC_DEMO_MODE=true`.
Tidak perlu seed terpisah untuk frontend demo.
