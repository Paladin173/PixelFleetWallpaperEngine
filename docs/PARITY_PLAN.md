# Pixel Fleet 1.3.1 Parity Plan

This project ports the Android live wallpaper behavior to Wallpaper Engine while
retaining the original APK assets. Android activities, store links, transparent
settings-window theming, crash-email handling, and Daydream registration are not
wallpaper runtime features and have no desktop equivalent.

## Runtime Settings

- [x] Brightness, capital ships, fighters, bombers, debris, and asteroid count
- [x] Survival, Galactic War, Free for All, and No Ships modes
- [x] Independent stars, space dust, planets, and asteroid-belt controls
- [x] Camera zoom for wider or closer battlefield views
- [x] Score visibility, placement, font size, color, opacity, and optional background
- [x] All twelve individual ship-class spawn toggles
- [x] Double-click destruction, slow-motion explosions, and automatic faction balancing
- [x] Hitbox, HP-bar, movement, state, projectile-target, and FPS debug overlays
- [x] Persistent score/statistics reset action adapted to a Wallpaper Engine toggle
- [x] Render quality and Wallpaper Engine FPS/pause integration

## Simulation

- [x] Three factions, six capital classes, three fighters, and three bombers
- [x] Maximum 20 capital ships, 30 fighters, and 20 bombers
- [x] APK-derived per-class laser, missile, beam, and ion batteries
- [x] Class shield capacities, collapse delays, recharge rates, and secondary weapons
- [x] Weapon-specific shield, hull, and subsystem damage
- [x] Target acquisition, engagement, retreat, destruction, debris, and warp states
- [x] Damaging free asteroids and a separately controlled decorative asteroid belt
- [x] Winner scoring, survivor warp-out, battle restart, and continuous modes
- [x] Persistent faction scores and lifetime combat statistics
- [x] APK-derived score-share and rank-transfer automatic faction balancing
- [x] APK-derived hull, shield, movement, turn, mount, charge, damage, and AI parameters
- [x] Desktop artillery, escort, and separation tactics around APK combat parameters
- [x] Unmodified APK score weighting validated with deterministic 120-battle evidence

## Acceptance Gates

- [x] Automated desktop, portrait, resize, pause, FPS, and ultrawide checks
- [x] Original settings mutate owning runtime behavior, not only manifest values
- [x] Score position and persistence verified through the rendered application
- [x] Camera zoom, score appearance, and star hiding verified through the rendered application
- [x] Maximum 70-ship battle instantiated by an automated browser test
- [ ] Live Wallpaper Engine import and performance acceptance
- [ ] Side-by-side long-duration comparison with the Android application