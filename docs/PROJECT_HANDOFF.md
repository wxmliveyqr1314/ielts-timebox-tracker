# IELTS TimeBox Tracker Project Handoff

## Current Release

- Version: v1.9.0
- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4
- Storage: LocalStorage primary, IndexedDB wallpaper cache, manual Supabase synchronization
- Hosting: Vercel

## Product Areas

- Daily planning and Focus Mode recommendation
- History editing and safe deletion
- Stats and streak reporting
- Supabase authentication and manual cloud synchronization
- Local-first cloud wallpaper
- Data health and JSON backup tools

## Quality Commands

- `npm test`: Vitest unit and component tests
- `npm run typecheck`: TypeScript validation
- `npm run build`: production Vite build
- `npm run test:e2e`: Chromium browser smoke tests after a build
- `npm run check`: unit tests, type checking, and production build

## Continuous Integration

`.github/workflows/quality.yml` runs unit tests, type checking, production build, and Playwright smoke tests for pull requests and pushes to main. It uses no production Supabase credentials.

## Data Safety Boundaries

- LocalStorage remains the primary local data source.
- Cloud synchronization is manual only.
- Daily-record deletion uses tombstones.
- Wallpaper blobs are isolated in IndexedDB and cloud paths are user-owned.
- Never commit `.env` files, service-role keys, Playwright artifacts, or exported user data.

## Residual Risks

- Real email delivery, authentication rate limits, production RLS, and multi-device conflicts require manual verification.
- The browser smoke suite uses Chromium only.
- Supabase Free projects may pause after inactivity.

## Development Workflow

1. Create a feature branch from current main.
2. Implement with focused tests and commits.
3. Run `npm run check` and `npm run test:e2e`.
4. Push and open a pull request.
5. Require the GitHub Actions Quality check to pass.
6. Review the real diff and deploy through Vercel.
7. Verify the displayed version and commit hash.
