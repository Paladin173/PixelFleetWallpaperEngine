# Pixel Fleet Live Wallpaper for Wallpaper Engine

A self-contained desktop port of Pixel Fleet Live Wallpaper 1.3.1. It uses the
original APK's pixel-art assets in a browser-native autonomous fleet simulation
for Wallpaper Engine.

Three factions field capital ships, fighters, and bombers. Ships acquire targets,
maneuver, fire lasers and guided missiles, recharge shields, explode, and scatter
debris. The original starfield, planets, nebula, asteroids, ship sprites, engine
overlays, shields, missiles, and debris are rendered with nearest-neighbor scaling.

## Installation

1. Copy this folder into `steamapps/common/wallpaper_engine/projects/myprojects/`.
2. In Wallpaper Engine, choose **Create Wallpaper** and select `index.html`.
3. Apply the wallpaper and adjust its properties.

The production wallpaper has no network or runtime package dependencies.

## Controls

Double-click a ship to destroy it. Interaction can be disabled in the wallpaper
properties.

## Development

```text
npm install
npm test
```

The Playwright suite validates rendering, asset loading, fleet behavior, property
changes, interaction, pause/FPS handling, and ultrawide render scaling.

## Port Notes

The APK identifies the original application as Pixel Fleet 1.3.1 by
HaydenTheAndroid. This project preserves its default Survival setup: 6 capital
ships, 12 fighters, 6 bombers, 30 asteroids, randomized background detail, ship
debris, slow-motion explosions, and double-tap/double-click destruction.