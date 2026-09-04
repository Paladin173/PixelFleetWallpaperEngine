# APK Combat Audit

This audit records the combat values recovered from Pixel Fleet 1.3.1 and the
corresponding Wallpaper Engine implementation. The source APK has SHA-256
`15FC864673F06DFAF276470E72BF4A28E06E2922DADE8ACB6174805BA4CDCAFE`.

The authoritative code paths are `Ship.setLoadout`, `Ship.AI.init`,
`Ship.System.updateWeaponSystem`, `Ship.hitShield`, `Ship.hitHull`,
`Projectile`, `GameLogic.processProjectiles`, and `Stats.updateSpawnProbabilities`.

## Ship Parameters

| Class | Hull | Shield | Speed | Turn | Weapons |
| --- | ---: | ---: | ---: | ---: | --- |
| Earth cruiser | 700 | 200 | 0.10 | 0.025 | Five independently randomized level-2 turrets |
| Earth missile frigate | 700 | 200 | 0.05 | 0.020 | Six level-1 missile ports |
| Gliese dreadnaught | 500 | 200 | 0.05 | 0.030 | Six level-2 point lasers, 2x charge rate |
| Gliese corvette | 500 | 200 | 0.07 | 0.030 | Six level-7 point beams, 5x charge rate |
| Eridani gunboat | 290 | 270 | 0.10 | 0.040 | Four level-7 ion turrets with laser secondary |
| Eridani destroyer | 350 | 250 | 0.04 | 0.025 | Six level-7 ion turrets with laser secondary |
| Earth fighter | 55 | 20 | 0.30 | 0.100 | Two level-1 point lasers |
| Gliese fighter | 50 | 20 | 0.20 | 0.110 | Two level-1 point lasers |
| Eridani fighter | 40 | 40 | 0.14 | 0.070 | One level-2 laser turret |
| Earth bomber | 100 | 40 | 0.08 | 0.040 | Two level-1 point missiles and one level-1 ion turret |
| Gliese bomber | 100 | 40 | 0.08 | 0.040 | Two level-3 short-duration point beams |
| Eridani bomber | 75 | 60 | 0.08 | 0.040 | Five-shot level-2 ion burst with laser secondary |

Turn and speed values above are the APK values before conversion from
degrees/millisecond and pixels/millisecond to seconds. Weapon damage follows
the APK level formula. Fighter lasers and ions use the APK 0.5 damage factor;
fighter missiles use its separate level formula.

## Shared Combat Rules

- Lasers deal 5 base damage, missiles 20, and ions 5 before level modifiers.
- Missiles deal 2x hull damage. Ions deal 2x shield and 0x hull damage.
- Shields absorb an entire projectile without overflow into hull.
- A collapsed shield waits three seconds before recharging.
- Recharge is 20 points/second for capitals, 10 for bombers, and 5 for fighters.
- Projectiles live for five seconds. Lasers and ions travel at 500 pixels/second;
  fighter bolts use the APK 1.5 speed multiplier; missiles travel at 250.
- Only missiles guide and reacquire. Other projectiles hit the first enemy ship
  intersected along their path.
- Ion hull hits drain ion integrity and can disable a ship for five seconds.
- Eridani ion systems select their laser secondary while the target has no shield.
- Turrets have the APK random ten-degree aiming error. Point mounts require a
  target inside their forward twenty-degree firing arc.

## AI Parameters

The port imports per-class turn rate, shield retreat/re-engage threshold,
straight-approach behavior, attack runs, hull-target preference, target
retention, and Eridani stand-off behavior. Faction group positions are randomly
assigned on every battle as in `GameLogic.spawnShipsLWP`.

## Deliberate Desktop Adaptations

- Coordinates wrap at the viewport edges to meet the desktop wallpaper edge
  requirement; the Android sector removes out-of-bounds projectiles.
- The APK's Earth cruiser `RANDOM` branch can select projectile enum members
  that its firing switch cannot emit. The port preserves those non-firing mount
  outcomes as `none` rather than constructing invalid projectile objects.
- The APK score/rank transfer formula is preserved. After its ten-point
  activation threshold, Earth spawn weight receives a 0.25 correction because
  the reduced Canvas movement model otherwise settles near 45/28/27 despite
  source-identical ship values. The correction measured 28/29/33 over the same
  deterministic 90-battle sample with zero timeouts.
- Complex per-pixel hull circles and individual component hit locations are
  represented by class collision radii and aggregate shield, engine, and weapon
  health. Shield interception uses the APK radii of 64, 30, and 24.

## Regression Evidence

Playwright verifies every class's hull, shield, speed, turn rate, AI flags,
weapon type, mount, damage, cooldown, secondary, and burst configuration. It
also exercises first-contact collision, missile reacquisition, ion disable and
recovery, shield collapse delay, damage bonuses, and Eridani secondary switching.