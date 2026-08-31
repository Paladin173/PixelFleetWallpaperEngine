(function () {
    "use strict";

    const TWO_PI = Math.PI * 2;
    const FACTIONS = ["earth", "gliese", "eridani"];
    const CAPITALS = {
        earth: [
            ["cruiser_1_4x.png", "cruiser_1_engine_4x.png", 700, 110, 0.82],
            ["earth_missile_cruiser_4x.png", "earth_missile_cruiser_engines_4x.png", 700, 92, 1.35]
        ],
        gliese: [
            ["gliese_dreadnaught_4x.png", "gliese_dreadnaught_engine_4x.png", 500, 96, 0.68],
            ["gliese_corvette.png", "gliese_corvette_engine.png", 500, 126, 0.55]
        ],
        eridani: [
            ["epsilon_eridani_gunboat.png", "epsilon_eridani_gunboat_engine.png", 565, 150, 0.72],
            ["epsilon_eridani_destroyer.png", "epsilon_eridani_destroyer_engine.png", 550, 82, 0.62]
        ]
    };
    const FIGHTERS = {
        earth: ["earth_fighter.png", "earth_fighter_engine.png", 55, 240, 0.48],
        gliese: ["gliese_fighter.png", "gliese_fighter_engine.png", 50, 210, 0.5],
        eridani: ["eridani_fighter.png", "eridani_fighter_engine.png", 50, 190, 0.52]
    };
    const BOMBERS = {
        earth: ["earth_bomber.png", "earth_bomber_engine.png", 110, 155, 1.25],
        gliese: ["gliese_bomber.png", "gliese_bomber_engine.png", 100, 150, 1.2],
        eridani: ["eridani_bomber.png", "eridani_bomber_engine.png", 100, 145, 1.18]
    };
    const SPAWN_SETTINGS = {
        "cruiser_1_4x.png": "spawnEarthCruiser",
        "earth_missile_cruiser_4x.png": "spawnEarthMissileFrigate",
        "earth_fighter.png": "spawnEarthFighter",
        "earth_bomber.png": "spawnEarthBomber",
        "gliese_corvette.png": "spawnGlieseCorvette",
        "gliese_dreadnaught_4x.png": "spawnGlieseDreadnaught",
        "gliese_fighter.png": "spawnGlieseFighter",
        "gliese_bomber.png": "spawnGlieseBomber",
        "epsilon_eridani_gunboat.png": "spawnEridaniGunboat",
        "epsilon_eridani_destroyer.png": "spawnEridaniDestroyer",
        "eridani_fighter.png": "spawnEridaniFighter",
        "eridani_bomber.png": "spawnEridaniBomber"
    };
    const EMPTY_FACTION_STATS = {
        score: 0,
        spawns: 0,
        kills: 0,
        deaths: 0,
        projectilesSpawned: 0,
        projectilesHit: 0,
        projectilesMissed: 0,
        systemsDestroyed: 0,
        shieldCollapses: 0,
        warps: 0
    };

    class Random {
        constructor(seed) {
            this.state = seed >>> 0;
        }

        next() {
            this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
            return this.state / 4294967296;
        }

        range(minimum, maximum) {
            return minimum + this.next() * (maximum - minimum);
        }

        pick(values) {
            return values[Math.floor(this.next() * values.length)];
        }
    }

    class FleetWorld {
        constructor(settings) {
            this.width = 1600;
            this.height = 900;
            this.random = new Random(0x50465831);
            this.settings = { ...settings };
            this.time = 0;
            this.ships = [];
            this.projectiles = [];
            this.effects = [];
            this.asteroids = [];
            this.decorations = [];
            this.spaceDust = [];
            this.nextId = 1;
            this.slowScale = 1;
            this.battleState = "active";
            this.battleTimer = 0;
            this.battleNumber = 0;
            this.stats = this.loadStats();
            this.restart();
        }

        setViewport(width, height) {
            const aspectRatio = width / height;
            const nextWidth = width < 640 ? 640 : height < 360 ? 360 * aspectRatio : width;
            const nextHeight = width < 640 ? 640 / aspectRatio : height < 360 ? 360 : height;
            const scaleX = nextWidth / this.width;
            const scaleY = nextHeight / this.height;
            for (const collection of [this.ships, this.projectiles, this.effects]) {
                for (const entity of collection) {
                    entity.x *= scaleX;
                    entity.y *= scaleY;
                }
            }
            this.width = nextWidth;
            this.height = nextHeight;
        }

        applySettings(settings) {
            const restartKeys = [
                "simulationMode", "capitalShips", "fighters", "bombers", "asteroids", "stars", "spaceDust",
                "planets", "asteroidBelt", "autoBalance", ...Object.values(SPAWN_SETTINGS)
            ];
            const restart = restartKeys.some((key) => this.settings[key] !== settings[key]);
            this.settings = { ...settings };
            if (restart) this.restart();
        }

        restart() {
            this.random = new Random(0x50465831);
            this.ships.length = 0;
            this.projectiles.length = 0;
            this.effects.length = 0;
            this.asteroids.length = 0;
            this.decorations.length = 0;
            this.spaceDust.length = 0;
            this.nextId = 1;
            this.battleState = "active";
            this.battleTimer = 0;
            this.battleNumber += 1;
            this.stats.systemsVisited += 1;
            const asteroidCount = Math.max(0, Math.min(200, Math.round(this.settings.asteroids)));
            for (let index = 0; index < asteroidCount; index += 1) {
                this.asteroids.push({
                    x: this.random.next(), y: this.random.next(),
                    size: this.random.range(8, 22), angle: this.random.range(0, TWO_PI),
                    spin: this.random.range(-0.12, 0.12), speedX: this.random.range(-0.008, 0.008),
                    speedY: this.random.range(-0.008, 0.008), hitTimer: 0,
                    sprite: `asteroid_${1 + Math.floor(this.random.next() * 3)}.png`
                });
            }
            this.background = {
                stars: this.showBackground("stars"),
                spaceDust: this.showBackground("spaceDust"),
                planets: this.showBackground("planets"),
                asteroidBelt: this.showBackground("asteroidBelt")
            };
            if (this.background.planets) {
                this.decorations.push({ sprite: "nebula.png", x: 0.2, y: 0.25, size: 520, alpha: 0.13, angle: 0.2 });
                this.decorations.push({ sprite: this.random.pick(["habitable_planet.png", "gas_planet.png", "gas_ring_planet.png", "rock_planet.png"]), x: 0.82, y: 0.22, size: 120, alpha: 0.8, angle: -0.15 });
            }
            if (this.background.spaceDust) {
                for (let index = 0; index < 90; index += 1) {
                    this.spaceDust.push({ x: this.random.next(), y: this.random.next(), speed: this.random.range(0.002, 0.012), alpha: this.random.range(0.15, 0.5) });
                }
            }
            if (this.background.asteroidBelt) {
                for (let index = 0; index < 32; index += 1) {
                    const angle = index / 32 * TWO_PI + this.random.range(-0.08, 0.08);
                    this.asteroids.push({
                        x: 0.5 + Math.cos(angle) * this.random.range(0.27, 0.34),
                        y: 0.5 + Math.sin(angle) * this.random.range(0.1, 0.15),
                        size: this.random.range(4, 11), angle: this.random.range(0, TWO_PI),
                        spin: this.random.range(-0.2, 0.2), speedX: 0, speedY: 0, hitTimer: 0,
                        sprite: `asteroid_${1 + Math.floor(this.random.next() * 3)}.png`, belt: true
                    });
                }
            }
            if (this.settings.simulationMode !== "noships") {
                this.spawnGroup("capital", Math.round(this.settings.capitalShips));
                this.spawnGroup("fighter", Math.round(this.settings.fighters));
                this.spawnGroup("bomber", Math.round(this.settings.bombers));
            }
            this.battleFactionCount = new Set(this.ships.map((ship) => ship.faction)).size;
            this.saveStats();
        }

        showBackground(name) {
            const value = this.settings[name];
            return value === "always" || (value === "randomly" && this.random.next() >= 0.5);
        }

        spawnGroup(type, count) {
            const limit = type === "fighter" ? 30 : 20;
            for (let index = 0; index < Math.max(0, Math.min(limit, count)); index += 1) {
                const faction = this.chooseFaction(type, index);
                if (!faction || !this.spawnShip(type, faction)) break;
            }
        }

        chooseFaction(type, index = 0) {
            const enabled = FACTIONS.filter((faction) => this.definitionsFor(type, faction).length > 0);
            if (!enabled.length) return null;
            const totalScore = FACTIONS.reduce((total, faction) => total + this.stats.factions[faction].score, 0);
            if (!this.settings.autoBalance || totalScore < 10) return enabled[index % enabled.length];
            const highestScore = Math.max(...enabled.map((faction) => this.stats.factions[faction].score));
            const weighted = enabled.flatMap((faction) => Array(Math.max(1, highestScore - this.stats.factions[faction].score + 1)).fill(faction));
            return this.random.pick(weighted);
        }

        definitionsFor(type, faction) {
            const definitions = type === "capital" ? CAPITALS[faction] : [type === "fighter" ? FIGHTERS[faction] : BOMBERS[faction]];
            return definitions.filter((definition) => this.settings[SPAWN_SETTINGS[definition[0]]]);
        }

        spawnShip(type, faction) {
            const definitions = this.definitionsFor(type, faction);
            if (!definitions.length) return false;
            const definition = this.random.pick(definitions);
            const lanes = { earth: 0.17, gliese: 0.5, eridani: 0.83 };
            const side = faction === "earth" ? 1 : faction === "eridani" ? -1 : (this.random.next() > 0.5 ? 1 : -1);
            const x = lanes[faction] * this.width + this.random.range(-this.width * 0.08, this.width * 0.08);
            const y = this.random.range(this.height * 0.2, this.height * 0.8);
            this.ships.push({
                id: this.nextId++, type, faction, sprite: definition[0], engine: definition[1],
                x, y, angle: side > 0 ? 0 : Math.PI, speed: definition[3], maxSpeed: definition[3],
                health: definition[2], maxHealth: definition[2], shield: definition[2] * 0.3,
                maxShield: definition[2] * 0.3, radius: type === "capital" ? 34 : type === "bomber" ? 17 : 11,
                fireDelay: definition[4], fireTimer: this.random.range(0, definition[4]), targetId: 0,
                retargetTimer: this.random.range(0, 0.5), state: "active", deathTimer: 0,
                aiState: "engaging", systems: { shields: 100, engine: 100, weapons: 100 },
                enginePulse: this.random.range(0, TWO_PI)
            });
            this.stats.factions[faction].spawns += 1;
            return true;
        }

        update(delta) {
            const hasExplosions = this.effects.some((effect) => effect.kind === "explosion" && effect.age < 0.65);
            const targetScale = this.settings.slowMotion && hasExplosions ? 0.25 : 1;
            this.slowScale += (targetScale - this.slowScale) * Math.min(1, delta * 4);
            const step = delta * this.slowScale;
            this.time += step;
            this.updateBackground(step);
            for (const ship of this.ships) this.updateShip(ship, step);
            this.updateProjectiles(step);
            this.updateEffects(step);
            this.ships = this.ships.filter((ship) => ship.state !== "dead");
            this.processBattleState(step);
            if (this.battleState === "active" && (this.settings.simulationMode === "galacticwar" || this.settings.simulationMode === "freeforall")) {
                this.replenishShips();
            }
        }

        updateShip(ship, delta) {
            if (ship.state === "exploding") {
                ship.deathTimer += delta;
                ship.angle += delta * 0.8;
                if (ship.deathTimer > 0.9) ship.state = "dead";
                return;
            }
            if (ship.state === "warping") {
                const direction = Math.atan2(ship.y - this.height / 2, ship.x - this.width / 2);
                ship.speed = Math.min(ship.maxSpeed * 8, ship.speed + ship.maxSpeed * delta * 3);
                ship.x += Math.cos(direction) * ship.speed * delta;
                ship.y += Math.sin(direction) * ship.speed * delta;
                ship.enginePulse += delta * 16;
                return;
            }
            ship.retargetTimer -= delta;
            let target = this.ships.find((candidate) => candidate.id === ship.targetId && candidate.state === "active");
            if (!target || ship.retargetTimer <= 0) {
                target = this.findTarget(ship);
                ship.targetId = target ? target.id : 0;
                ship.retargetTimer = this.random.range(0.25, 0.7);
            }
            if (!target) return;
            const offsetX = target.x - ship.x;
            const offsetY = target.y - ship.y;
            const distance = Math.hypot(offsetX, offsetY) || 1;
            const desired = Math.atan2(offsetY, offsetX);
            ship.aiState = ship.health / ship.maxHealth < 0.22 ? "retreating" : "engaging";
            const targetAngle = ship.aiState === "retreating" ? desired + Math.PI : desired;
            let angleDelta = ((targetAngle - ship.angle + Math.PI * 3) % TWO_PI) - Math.PI;
            const turnRate = ship.type === "fighter" ? 2.9 : ship.type === "bomber" ? 1.8 : 0.72;
            ship.angle += Math.max(-turnRate * delta, Math.min(turnRate * delta, angleDelta));
            const idealRange = ship.type === "capital" ? 260 : ship.type === "bomber" ? 210 : 130;
            const thrust = ship.aiState === "retreating" ? 1 : distance > idealRange ? 1 : distance < idealRange * 0.55 ? -0.35 : 0.2;
            const engineFactor = 0.35 + ship.systems.engine / 100 * 0.65;
            ship.speed += (ship.maxSpeed * engineFactor * thrust - ship.speed) * Math.min(1, delta * 2.5);
            ship.x += Math.cos(ship.angle) * ship.speed * delta;
            ship.y += Math.sin(ship.angle) * ship.speed * delta;
            ship.x = ((ship.x % this.width) + this.width) % this.width;
            ship.y = ((ship.y % this.height) + this.height) % this.height;
            ship.shield = Math.min(ship.maxShield, ship.shield + ship.maxShield * 0.025 * (ship.systems.shields / 100) * delta);
            ship.fireTimer -= delta;
            if (ship.aiState === "engaging" && ship.systems.weapons > 0 && ship.fireTimer <= 0 && distance < (ship.type === "capital" ? 520 : 340) && Math.abs(angleDelta) < 0.55) {
                this.fire(ship, target);
                const weaponFactor = 2 - ship.systems.weapons / 100;
                ship.fireTimer = (ship.type === "fighter" ? 0.48 : ship.type === "bomber" ? 1.2 : 0.72) * weaponFactor * this.random.range(0.8, 1.25);
            }
            ship.enginePulse += delta * 8;
        }

        findTarget(ship) {
            const freeForAll = this.settings.simulationMode === "freeforall";
            let closest = null;
            let closestDistance = Infinity;
            for (const candidate of this.ships) {
                if (candidate === ship || candidate.state !== "active") continue;
                if (!freeForAll && candidate.faction === ship.faction) continue;
                const distance = (candidate.x - ship.x) ** 2 + (candidate.y - ship.y) ** 2;
                if (distance < closestDistance) {
                    closest = candidate;
                    closestDistance = distance;
                }
            }
            return closest;
        }

        fire(ship, target) {
            const weapon = ship.type === "bomber" || ship.sprite.includes("missile") ? "missile" :
                ship.sprite === "gliese_corvette.png" ? "beam" :
                    ship.faction === "eridani" && ship.type === "capital" ? "ion" : "laser";
            const missile = weapon === "missile";
            const speed = missile ? 255 : ship.type === "fighter" ? 490 : 420;
            const color = weapon === "ion" ? "#35a8ff" : ship.faction === "earth" ? "#76d7ff" : ship.faction === "gliese" ? "#ff6659" : "#7dffad";
            this.stats.factions[ship.faction].projectilesSpawned += 1;
            if (weapon === "beam") {
                this.damageShip(target, 14, ship.faction);
                this.stats.factions[ship.faction].projectilesHit += 1;
                this.effects.push({ kind: "beam", x: ship.x, y: ship.y, targetX: target.x, targetY: target.y, age: 0, life: 0.18, size: 3, color });
                return;
            }
            this.projectiles.push({
                x: ship.x + Math.cos(ship.angle) * ship.radius,
                y: ship.y + Math.sin(ship.angle) * ship.radius,
                vx: Math.cos(ship.angle) * speed,
                vy: Math.sin(ship.angle) * speed,
                angle: ship.angle,
                targetId: target.id,
                faction: ship.faction,
                damage: missile ? 36 : ship.type === "capital" ? 18 : 8,
                life: missile ? 4 : 1.8,
                missile,
                weapon,
                color
            });
        }

        updateProjectiles(delta) {
            for (const projectile of this.projectiles) {
                projectile.life -= delta;
                if (projectile.missile) {
                    const target = this.ships.find((ship) => ship.id === projectile.targetId && ship.state === "active");
                    if (target) {
                        const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x);
                        let turn = ((desired - projectile.angle + Math.PI * 3) % TWO_PI) - Math.PI;
                        projectile.angle += Math.max(-2.5 * delta, Math.min(2.5 * delta, turn));
                        const speed = Math.hypot(projectile.vx, projectile.vy);
                        projectile.vx = Math.cos(projectile.angle) * speed;
                        projectile.vy = Math.sin(projectile.angle) * speed;
                    }
                    this.effects.push({ kind: "smoke", x: projectile.x, y: projectile.y, age: 0, life: 0.45, size: 5 });
                }
                projectile.x += projectile.vx * delta;
                projectile.y += projectile.vy * delta;
                const target = this.ships.find((ship) => ship.id === projectile.targetId && ship.state === "active");
                if (target && Math.hypot(target.x - projectile.x, target.y - projectile.y) < target.radius + 5) {
                    this.damageShip(target, projectile.damage, projectile.faction);
                    projectile.life = 0;
                    this.stats.factions[projectile.faction].projectilesHit += 1;
                    this.effects.push({ kind: "hit", x: projectile.x, y: projectile.y, age: 0, life: 0.28, size: projectile.missile ? 26 : 13, color: projectile.color });
                }
            }
            this.projectiles = this.projectiles.filter((projectile) => {
                const active = projectile.life > 0 && projectile.x > -100 && projectile.y > -100 && projectile.x < this.width + 100 && projectile.y < this.height + 100;
                if (!active && projectile.life !== 0) this.stats.factions[projectile.faction].projectilesMissed += 1;
                return active;
            });
        }

        damageShip(ship, damage, attackingFaction = null) {
            const hadShield = ship.shield > 0;
            const shieldDamage = Math.min(ship.shield, damage);
            ship.shield -= shieldDamage;
            if (hadShield && ship.shield <= 0) this.stats.factions[ship.faction].shieldCollapses += 1;
            ship.health -= damage - shieldDamage;
            const hullDamage = damage - shieldDamage;
            if (hullDamage > 0 && this.random.next() < 0.3) {
                const systemName = this.random.pick(["shields", "engine", "weapons"]);
                const previous = ship.systems[systemName];
                ship.systems[systemName] = Math.max(0, previous - hullDamage * 0.8);
                if (previous > 0 && ship.systems[systemName] === 0 && attackingFaction && this.stats.factions[attackingFaction]) {
                    this.stats.factions[attackingFaction].systemsDestroyed += 1;
                }
            }
            if (ship.health <= 0 && this.destroyShip(ship)) {
                if (attackingFaction && this.stats.factions[attackingFaction]) this.stats.factions[attackingFaction].kills += 1;
                this.saveStats();
            }
        }

        destroyShip(ship) {
            if (!ship || ship.state !== "active") return false;
            ship.state = "exploding";
            ship.deathTimer = 0;
            this.stats.factions[ship.faction].deaths += 1;
            const bursts = ship.type === "capital" ? 9 : 4;
            for (let index = 0; index < bursts; index += 1) {
                this.effects.push({
                    kind: "explosion", x: ship.x + this.random.range(-ship.radius, ship.radius),
                    y: ship.y + this.random.range(-ship.radius, ship.radius), age: -index * 0.045,
                    life: 0.75, size: this.random.range(18, ship.type === "capital" ? 56 : 32)
                });
            }
            if (this.settings.debris) {
                for (let index = 0; index < (ship.type === "capital" ? 7 : 3); index += 1) {
                    const angle = this.random.range(0, TWO_PI);
                    this.effects.push({
                        kind: "debris", x: ship.x, y: ship.y, age: 0, life: 4,
                        size: this.random.range(5, 12), vx: Math.cos(angle) * this.random.range(25, 80),
                        vy: Math.sin(angle) * this.random.range(25, 80), angle, spin: this.random.range(-4, 4),
                        sprite: `ship_debris_${1 + Math.floor(this.random.next() * 3)}.png`
                    });
                }
            }
            return true;
        }

        updateEffects(delta) {
            for (const effect of this.effects) {
                effect.age += delta;
                if (effect.kind === "debris") {
                    effect.x += effect.vx * delta;
                    effect.y += effect.vy * delta;
                    effect.angle += effect.spin * delta;
                }
            }
            this.effects = this.effects.filter((effect) => effect.age < effect.life);
        }

        replenishShips() {
            const expected = { capital: Math.round(this.settings.capitalShips), fighter: Math.round(this.settings.fighters), bomber: Math.round(this.settings.bombers) };
            for (const type of Object.keys(expected)) {
                const active = this.ships.filter((ship) => ship.type === type && ship.state !== "dead").length;
                if (active < expected[type] && this.random.next() < 0.018) {
                    const faction = this.chooseFaction(type, active);
                    if (faction) this.spawnShip(type, faction);
                }
            }
        }

        updateBackground(delta) {
            for (const dust of this.spaceDust) {
                dust.x = (dust.x + dust.speed * delta) % 1;
            }
            for (const asteroid of this.asteroids) {
                asteroid.angle += asteroid.spin * delta;
                asteroid.x = ((asteroid.x + asteroid.speedX * delta) % 1 + 1) % 1;
                asteroid.y = ((asteroid.y + asteroid.speedY * delta) % 1 + 1) % 1;
                asteroid.hitTimer = Math.max(0, asteroid.hitTimer - delta);
                if (asteroid.belt || asteroid.hitTimer > 0) continue;
                const x = asteroid.x * this.width;
                const y = asteroid.y * this.height;
                const ship = this.ships.find((candidate) => candidate.state === "active" && Math.hypot(candidate.x - x, candidate.y - y) < candidate.radius + asteroid.size / 2);
                if (ship) {
                    this.damageShip(ship, 7, null);
                    asteroid.hitTimer = 0.75;
                    this.effects.push({ kind: "hit", x, y, age: 0, life: 0.25, size: 12, color: "#c8bba4" });
                }
            }
        }

        processBattleState(delta) {
            if (this.settings.simulationMode === "noships" || this.settings.simulationMode === "freeforall" || this.battleFactionCount < 2) return;
            if (this.battleState === "warp") {
                this.battleTimer -= delta;
                if (this.battleTimer <= 0) this.restart();
                return;
            }
            const activeFactions = [...new Set(this.ships.filter((ship) => ship.state === "active").map((ship) => ship.faction))];
            const remainingShips = this.ships.filter((ship) => ship.state === "active" || ship.state === "exploding");
            if (remainingShips.length && activeFactions.length > 1) return;
            const winner = activeFactions[0];
            if (winner) this.stats.factions[winner].score += 1;
            for (const ship of this.ships) {
                if (ship.state === "active") {
                    ship.state = "warping";
                    this.stats.factions[ship.faction].warps += 1;
                }
            }
            this.projectiles.length = 0;
            this.battleState = "warp";
            this.battleTimer = 3;
            this.saveStats();
        }

        loadStats() {
            const fresh = { systemsVisited: 0, factions: {} };
            for (const faction of FACTIONS) fresh.factions[faction] = { ...EMPTY_FACTION_STATS };
            try {
                const saved = JSON.parse(localStorage.getItem("pixelFleetStatsV1"));
                if (!saved || !saved.factions) return fresh;
                fresh.systemsVisited = Number(saved.systemsVisited) || 0;
                for (const faction of FACTIONS) Object.assign(fresh.factions[faction], saved.factions[faction] || {});
            } catch (_error) {
                return fresh;
            }
            return fresh;
        }

        saveStats() {
            try {
                localStorage.setItem("pixelFleetStatsV1", JSON.stringify(this.stats));
            } catch (_error) {
                // Wallpaper Engine may disable storage for local previews.
            }
        }

        clearStats() {
            this.stats = this.loadStats();
            this.stats.systemsVisited = 0;
            for (const faction of FACTIONS) this.stats.factions[faction] = { ...EMPTY_FACTION_STATS };
            this.saveStats();
        }

        destroyAt(x, y, radius) {
            let closest = null;
            let closestDistance = radius;
            for (const ship of this.ships) {
                const distance = Math.hypot(ship.x - x, ship.y - y);
                if (ship.state === "active" && distance < closestDistance) {
                    closest = ship;
                    closestDistance = distance;
                }
            }
            return this.destroyShip(closest);
        }
    }

    window.FleetWorld = FleetWorld;
}());