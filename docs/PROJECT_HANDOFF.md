# IELTS TimeBox Tracker Project Handoff

## Current Release

- Version: v2.0.0
- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, vite-plugin-pwa (PWA Shell)
- Storage: LocalStorage primary, IndexedDB wallpaper cache, manual Supabase synchronization
- Hosting: Vercel

The app is an installable Progressive Web App (PWA), not a native APK/IPA.

## Product Areas

- Daily planning and Focus Mode recommendation
- History editing and safe deletion
- Stats and streak reporting
- Supabase authentication and manual cloud synchronization
- Local-first cloud wallpaper
- Data health and JSON backup tools
- Offline PWA shell with local-first features (cloud actions disabled while offline)

## Quality Commands

- `npm test`: Vitest unit and component tests
- `npm run typecheck`: TypeScript validation
- `npm run icons:generate`: Deterministic generation of PWA icons using Sharp
- `npm run icons:check`: Validation of PWA icon dimensions
- `npm run build`: production Vite build (emits manifest and service worker)
- `npm run test:e2e`: Chromium browser smoke tests and PWA offline Playwright coverage
- `npm run check`: unit tests, type checking, and production build

## Continuous Integration

`.github/workflows/quality.yml` runs unit tests, type checking, production build, and Playwright smoke tests for pull requests and pushes to main. It uses no production Supabase credentials.

## Data Safety Boundaries

- LocalStorage remains the primary local data source.
- Cloud synchronization is manual only.
- `vite-plugin-pwa` precaches only the application shell and static assets.
- Supabase API traffic is not runtime-cached.
- Daily-record deletion uses tombstones.
- Wallpaper blobs are isolated in IndexedDB and cloud paths are user-owned.
- Never commit `.env` files, service-role keys, Playwright artifacts, or exported user data.

## Residual Risks

- Real email delivery, authentication rate limits, production RLS, and multi-device conflicts require manual verification.
- The browser smoke suite uses Chromium only.
- Supabase Free projects may pause after inactivity.
- Real-device installation remains a manual release check.

## Development Workflow

1. Create a feature branch from current main.
2. Implement with focused tests and commits.
3. Run `npm run check` and `npm run test:e2e`.
4. Push and open a pull request.
5. Require the GitHub Actions Quality check to pass.
6. Review the real diff and deploy through Vercel.
7. Verify the displayed version and commit hash.
