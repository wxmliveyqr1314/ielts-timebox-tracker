# v2.0 PWA And App Icon Design

## Objective

Turn IELTS TimeBox Tracker from a conventional hosted website into an installable Progressive Web App with a recognizable TimeBox icon, standalone mobile presentation, and safe local-first offline behavior.

The result remains a Web application deployed through Vercel. It does not become an Android APK, iOS App Store package, or native application. On supported phones it should install to the home screen and open in its own app window without the normal browser address bar.

## Product Identity

### Names

- Full application name: `TimeBox Tracker`
- Home-screen short name: `TimeBox`
- Browser title: `TimeBox Tracker`
- Product description: `Local-first IELTS study planning, tracking, and progress review.`

The short name is deliberately compact so iOS and Android do not truncate the home-screen label.

### Selected Icon: TimeBox Frame

The icon evolves the existing white `T` monogram rather than introducing a separate brand.

Visual construction:

- Rounded-square indigo base with a subtle diagonal transition from `#3829D9` to `#695CFF`.
- Centered white uppercase `T` with a heavy geometric weight.
- Thin translucent inner rounded frame representing a time box.
- Small amber dot in the upper-right area representing time, focus, and forward motion.
- No words, small numerals, detailed clock hands, or IELTS-specific text inside the icon.

Geometry and safety:

- Master artwork: square vector source at a 1024 by 1024 viewBox.
- Key visual content remains inside the central 76 percent safe region.
- Standard icons retain rounded corners in the artwork.
- Maskable icon background fills the entire canvas; all essential marks remain inside the maskable safe circle.
- The icon must remain recognizable at 32 pixels and retain a visible `T` at 16 pixels.

Required committed assets:

- `public/favicon.svg`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png` at 180 by 180
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/maskable-512x512.png`
- `public/icon-source.svg` as the reproducible master

Raster assets must be generated deterministically from the committed vector source. They must not be screenshots or manually resized low-resolution files.

## PWA Architecture

Use `vite-plugin-pwa` with Workbox's generated service worker.

The plugin owns:

- Web App Manifest generation;
- static build-asset precaching;
- service-worker generation and registration;
- navigation fallback to the application shell;
- update activation for future deployments.

The existing Vite build, Vercel deployment, React application, LocalStorage records, IndexedDB wallpaper cache, and Supabase client remain in place.

### Manifest

The manifest must define:

- `name`: `TimeBox Tracker`
- `short_name`: `TimeBox`
- `description`: the product description above
- `start_url`: `/`
- `scope`: `/`
- `display`: `standalone`
- `background_color`: `#F8FAFC`
- `theme_color`: `#4F46E5`
- portrait-first orientation without preventing desktop use
- standard 192 and 512 PNG icons
- a separate 512 maskable icon with `purpose: maskable`

The HTML head must also contain the correct title, theme color, description, favicon, and Apple Touch Icon declarations so browsers that only partially use the manifest still show the right identity.

## Offline Behavior

### Available Offline

After one successful online visit, the installed PWA should reopen without a network connection and support:

- Daily plan viewing and local editing;
- History viewing, editing, and local deletion;
- Stats calculated from local records;
- JSON export where supported by the browser;
- Data Health inspection;
- existing locally cached wallpaper display;
- version and local settings display.

These capabilities already depend on LocalStorage or IndexedDB and must continue using those stores.

### Unavailable Offline

The following actions require a network connection:

- sending a Magic Link or OTP email;
- verifying a new authentication session;
- manual daily-record cloud synchronization;
- uploading, replacing, downloading, or removing a cloud wallpaper;
- any direct Supabase operation.

The application must not queue these cloud operations silently. It should explain that the device is offline and let the user retry after connectivity returns.

### Caching Boundary

Precache only the application shell and hashed static build assets.

Do not runtime-cache:

- Supabase REST responses;
- authentication requests or tokens;
- Storage API responses;
- user record JSON from the cloud;
- Magic Link or OTP traffic.

This prevents stale cloud data, authentication leakage, and conflicts with the application's explicit manual-sync model.

## Connectivity Experience

Add a small shared `useOnlineStatus` hook based on `navigator.onLine` plus the browser `online` and `offline` events.

When offline:

- show a compact `Offline` indicator near the top of the application content;
- keep local pages usable;
- disable Magic Link, OTP verification, Sync now, and wallpaper cloud mutation controls;
- provide a short explanation rather than exposing a raw network exception.

When the browser emits `online`, remove the indicator and re-enable cloud controls. Do not automatically trigger synchronization or upload queued actions.

The status is advisory: a device can report online while a remote service is unreachable. Existing operation-level error handling remains required.

## Service Worker Updates

Use automatic service-worker registration and update checks, but do not force an immediate page reload while the user is editing.

A newly downloaded service worker may activate in the background; the current page continues running until the user naturally reloads or reopens the application. The Settings version badge remains the source for confirming the deployed version and commit.

No separate update modal is required for v2.0.

## Installation Experience

The browser's native installation mechanisms remain the primary path:

- Android and compatible desktop browsers may show `Install app`.
- iPhone and iPad users use Safari's `Add to Home Screen` action.

Do not add an aggressive installation popup. A quiet informational row may be added in Settings only when the browser exposes `beforeinstallprompt`; dismissing it must be respected for the current session.

The PWA must also remain fully usable as an ordinary browser website.

## Data Safety

- Service-worker activation must not clear LocalStorage or IndexedDB.
- Offline mode must never replace existing records with an empty state.
- Reconnection must not trigger automatic cloud synchronization.
- Cached application files must not contain Supabase secrets.
- Existing corrupted-LocalStorage backup behavior remains unchanged.
- Existing wallpaper account isolation remains unchanged.

## Testing Strategy

### Unit And Component Tests

- `useOnlineStatus` initializes from `navigator.onLine` and responds to both connectivity events.
- Offline cloud controls render disabled with understandable messaging.
- Online recovery re-enables controls without initiating sync.
- Install-prompt state appears only when the browser supplies the event.

### Build And Manifest Tests

- Production build emits a manifest and service worker.
- Every manifest icon path resolves to a committed file.
- Manifest names, colors, display mode, start URL, and purposes match this specification.
- PNG files have the required dimensions and nonzero size.

### Playwright Tests

1. Open the production preview online to populate the service-worker cache.
2. Confirm the service worker controls the page.
3. Seed deterministic local DailyRecord data.
4. Switch the browser context offline and reload.
5. Confirm Daily, History, Stats, and Settings still open.
6. Confirm the `Offline` indicator is visible.
7. Confirm local History and Stats data remain present.
8. Confirm cloud and authentication actions are disabled.
9. Confirm the installed/mobile viewport has no horizontal overflow.

Playwright artifacts are retained only on failure and remain ignored by Git.

### Manual Device Acceptance

Verify on at least one real phone:

- home-screen icon appearance;
- `TimeBox` label is not truncated;
- standalone launch has no ordinary browser address bar;
- splash/background colors look intentional;
- offline reopen works after a prior online visit;
- reconnect restores cloud buttons without auto-syncing;
- current local records and wallpaper remain intact.

## Scope Exclusions

- Google Play or Apple App Store distribution.
- Capacitor, Cordova, React Native, or native wrappers.
- Push notifications.
- Background Sync API.
- Periodic background synchronization.
- Automatic cloud synchronization.
- Share Target, file-handler, or protocol-handler capabilities.
- Full offline Supabase authentication.
- Redesign of Daily, History, Stats, or Settings.

## Acceptance Criteria

v2.0 is complete when:

1. The deployed application advertises a valid installable manifest.
2. The selected TimeBox Frame icon appears correctly at favicon, Apple, standard PWA, and maskable sizes.
3. The home-screen label is `TimeBox` and the standalone title is `TimeBox Tracker`.
4. The application reopens offline after one online visit.
5. Local records, stats, and cached wallpaper remain available offline.
6. Network-only controls are visibly disabled offline and return online without automatic synchronization.
7. Supabase traffic and user cloud data are not runtime-cached.
8. Unit tests, TypeScript, production build, existing Playwright smoke tests, and new PWA offline tests pass.
9. GitHub Actions succeeds without production credentials.
10. Settings displays `v2.0.0` and the correct deployed commit after release.

## Residual Risks

- Browser installation UI differs across Android vendors and iOS versions.
- `navigator.onLine` cannot prove Supabase availability.
- iOS may evict PWA caches under device-storage pressure.
- Offline JSON download behavior varies by mobile browser.
- Service-worker changes require careful regression testing because an old cached shell can survive a deployment until the next update cycle.
