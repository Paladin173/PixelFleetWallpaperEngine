# Pixel Fleet Live Wallpaper for Wallpaper Engine

A self-contained desktop port of Pixel Fleet Live Wallpaper 1.3.1. It uses the
original APK's pixel-art assets in a browser-native autonomous fleet simulation
for Wallpaper Engine.

Three factions field capital ships, fighters, and bombers. Ships acquire targets,
maneuver, retreat, fire lasers, ion shots, beams, and guided missiles, take hull
and subsystem damage, recharge shields, explode, warp away, and scatter debris.
The original starfield, planets, nebula, asteroids, ship sprites, engine overlays,
shields, weapon effects, and debris are rendered with nearest-neighbor scaling.

Each of the twelve ship classes uses its APK loadout rather than a generic shot.
Earth missile frigates launch six-missile volleys, Gliese corvettes and bombers
carry beam batteries, and Eridani ion batteries switch to secondary lasers after
their target's shields collapse. Class-specific shield capacities, collapse
delays, recharge rates, and weapon-specific shield and hull damage are preserved.

Battles support the original 70-ship ceiling. Winning factions earn persistent
scores, surviving ships warp out, and a new system is generated. Lifetime spawn,
kill, death, projectile, subsystem, shield, and warp statistics persist locally.

## Installation

1. Copy this folder into `steamapps/common/wallpaper_engine/projects/myprojects/`.
2. In Wallpaper Engine, choose **Create Wallpaper** and select `index.html`.
3. Apply the wallpaper and adjust its properties.

The production wallpaper has no network or runtime package dependencies.

## Controls

Double-click a ship to destroy it. Interaction can be disabled in the wallpaper
properties.

## Settings

Wallpaper Engine properties include the original battle modes and population
limits; independent stars, space dust, planets, and asteroid-belt controls; all
twelve ship-class spawn toggles; brightness, debris, slow motion, and automatic
faction balancing; and all six original debug overlays.

Auto-balance follows the APK's persistent score system. Once cumulative faction
score reaches ten, lower-scoring factions receive a larger share of the next
battle's initial fleet while ship damage and durability remain fixed. The APK's
score weighting and faction ordering are preserved without faction-specific
corrections.

Camera zoom-out ranges from 1x to 5x. The new 1x baseline already shows 2.5 times
as much battlefield as the original view, while higher values reveal progressively
more space. Set Stars to Never to hide the starfield independently of the other
background elements. Collapsible headings separate Display, Battle, Environment,
Effects & Interaction, Scoreboard, each faction's fleet, and Diagnostics. Display
starts expanded; the other sections stay folded until needed.

The faction score can be shown at the top or bottom of the screen. Extended
horizontal and vertical offsets adjust its exact position on high-resolution
displays. Font size, text color, text opacity, and an optional adjustable-opacity
background are configurable. A reset toggle clears persistent score and
statistics; switch it off and on again to perform another reset.

## Development

```text
npm install
npm test
```

The Playwright suite validates rendering, asset loading, every settings group,
camera zoom, score appearance, positioning and persistence, star hiding, battle
restarts, maximum-size battles, combat, interaction, pause/FPS handling, portrait
layouts, and ultrawide render scaling.

## Port Notes

The APK identifies the original application as Pixel Fleet 1.3.1 by
HaydenTheAndroid. This project preserves its default Survival setup: 6 capital
ships, 12 fighters, 6 bombers, 30 asteroids, randomized background detail, ship
debris, slow-motion explosions, and double-tap/double-click destruction.

See [docs/PARITY_PLAN.md](docs/PARITY_PLAN.md) for the implementation matrix and
remaining live-host acceptance gates. The source-backed combat values and
desktop adaptations are recorded in [docs/APK_COMBAT_AUDIT.md](docs/APK_COMBAT_AUDIT.md).