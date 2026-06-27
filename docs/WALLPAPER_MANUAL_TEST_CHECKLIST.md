# Wallpaper Manual Test Checklist

## 1. Auth & Account Isolation
- [ ] Log in as User A, upload wallpaper, verify it shows.
- [ ] Log out, verify wallpaper reverts to disabled default.
- [ ] Log in as User B, verify User A's wallpaper is not visible.
- [ ] Log in as User A again, verify User A's wallpaper restores.

## 2. Offline Resilience
- [ ] Set wallpaper, go offline (disconnect internet).
- [ ] Refresh the page, verify wallpaper still loads from local IndexedDB cache immediately.
- [ ] Reconnect to internet, verify no errors.

## 3. Disabling & Re-enabling
- [ ] Disable wallpaper using the toggle.
- [ ] Refresh the page, verify wallpaper is hidden.
- [ ] Open Settings, verify the preview and toggle are still visible.
- [ ] Re-enable the toggle, verify the same wallpaper immediately restores.

## 4. UI Rendering
- [ ] Settings Page: Verify the main content area has a translucent background and scrolls properly over the fixed wallpaper.
- [ ] History/Daily Page: Verify top-level cards have `.wallpaper-surface` translucency applied, while retaining readability.
- [ ] Adjust opacity slider, verify the preview darkens/lightens correctly with debounce.

## 5. Visual Testing
- [ ] Desktop View
- [ ] Tablet View
- [ ] Mobile View (ensure no horizontal overflow on the Daily Tracker page)
