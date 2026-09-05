(function () {
    "use strict";

    const TWO_PI = Math.PI * 2;
    const FACTIONS = ["earth", "gliese", "eridani"];
    const ship = (sprite, engine, hull, speed, turnRate, shield, shieldAttackThreshold, ai = {}) => ({
        sprite, engine, hull, speed: speed * 1000, turnRate: turnRate * Math.PI / 180 * 1000,
        shield, shieldAttackThreshold, attackRunDistance: speed * 800, ...ai
    });
    const CAPITALS = {
        earth: [
            ship("cruiser_1_4x.png", "cruiser_1_engine_4x.png", 700, 0.1, 0.025, 200, 0.5, { preferHullDamage: true, randomWeapons: true, carrier: true }),
            ship("earth_missile_cruiser_4x.png", "earth_missile_cruiser_engines_4x.png", 700, 0.05, 0.02, 200, 0.5, { preferHullDamage: true })
        ],
        gliese: [
            ship("gliese_dreadnaught_4x.png", "gliese_dreadnaught_engine_4x.png", 500, 0.05, 0.03, 200, -Infinity, { straightAttackPath: true, focusEngage: true }),
            ship("gliese_corvette.png", "gliese_corvette_engine.png", 500, 0.07, 0.03, 200, -Infinity, { straightAttackPath: true, focusEngage: true })
        ],
        eridani: [
            ship("epsilon_eridani_gunboat.png", "epsilon_eridani_gunboat_engine.png", 290, 0.1, 0.04, 270, 0.75, { keepDistance: true }),
            ship("epsilon_eridani_destroyer.png", "epsilon_eridani_destroyer_engine.png", 350, 0.04, 0.025, 250, 0.5)
        ]
    };
    const FIGHTERS = {
        earth: ship("earth_fighter.png", "earth_fighter_engine.png", 55, 0.3, 0.1, 20, 0.5, { preferHullDamage: true, straightAttackPath: true, attackRuns: true }),
        gliese: ship("gliese_fighter.png", "gliese_fighter_engine.png", 50, 0.2, 0.11, 20, -Infinity, { preferHullDamage: true, straightAttackPath: true, attackRuns: true }),
        eridani: ship("eridani_fighter.png", "eridani_fighter_engine.png", 40, 0.14, 0.07, 40, 0.5, { preferHullDamage: true, keepDistance: true })
    };
    const BOMBERS = {
        earth: ship("earth_bomber.png", "earth_bomber_engine.png", 100, 0.08, 0.04, 40, 0.5, { preferHullDamage: true, straightAttackPath: true, attackRuns: true }),
        gliese: ship("gliese_bomber.png", "gliese_bomber_engine.png", 100, 0.08, 0.04, 40, -Infinity, { preferHullDamage: true, straightAttackPath: true, attackRuns: true }),
        eridani: ship("eridani_bomber.png", "eridani_bomber_engine.png", 75, 0.08, 0.04, 60, 0.5, { preferHullDamage: true })
    };
    const WEAPON_BATTERIES = {
        "cruiser_1_4x.png": [{ weapon: "beam", count: 1, damage: 14.4, cooldown: 1.5, mount: "turret" }, { weapon: "laser", count: 4, damage: 6, cooldown: 0.5, mount: "turret" }],
        "earth_missile_cruiser_4x.png": [{ weapon: "missile", count: 6, damage: 20, cooldown: 2, mount: "port" }],
        "gliese_dreadnaught_4x.png": [{ weapon: "laser", count: 6, damage: 6, cooldown: 0.25, mount: "point" }],
        "gliese_corvette.png": [{ weapon: "beam", count: 6, damage: 26.4, cooldown: 1.1, mount: "point" }],
        "epsilon_eridani_gunboat.png": [{ weapon: "ion", secondary: "laser", count: 4, damage: 11, cooldown: 1.5, mount: "turret" }],
        "epsilon_eridani_destroyer.png": [{ weapon: "ion", secondary: "laser", count: 6, damage: 11, cooldown: 1.5, mount: "turret" }],
        "earth_fighter.png": [{ weapon: "laser", count: 2, damage: 2.5, cooldown: 0.25, mount: "point" }],
        "gliese_fighter.png": [{ weapon: "laser", count: 2, damage: 2.5, cooldown: 0.25, mount: "point" }],
        "eridani_fighter.png": [{ weapon: "laser", count: 1, damage: 3, cooldown: 0.25, mount: "turret" }],
        "earth_bomber.png": [{ weapon: "missile", count: 2, damage: 10, cooldown: 2, mount: "point" }, { weapon: "ion", count: 1, damage: 2.5, cooldown: 0.25, mount: "turret" }],
        "gliese_bomber.png": [{ weapon: "beam", count: 2, damage: 1.68, cooldown: 0.15, mount: "point" }],
        "eridani_bomber.png": [{ weapon: "ion", secondary: "laser", count: 1, damage: 3, cooldown: 0.05, burst: 5, burstCooldown: 0.55, mount: "turret" }]
    };
    const EARTH_CRUISER_RANDOM_WEAPONS = [
        { weapon: "laser", damage: 6, cooldown: 0.5, mount: "turret" },
        { weapon: "ion", damage: 6, cooldown: 0.5, mount: "turret" },
        { weapon: "beam", damage: 14.4, cooldown: 1.5, mount: "turret" },
        { weapon: "missile", damage: 24, cooldown: 2, mount: "turret" },
        { weapon: "none", damage: 0, cooldown: 0.5, mount: "turret" },
        { weapon: "none", damage: 0, cooldown: 0.5, mount: "turret" },
        { weapon: "none", damage: 0, cooldown: 0.5, mount: "turret" },
        { weapon: "none", damage: 0, cooldown: 0.5, mount: "turret" }
    ];
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
            this.random = new Random((0x50465831 + Math.imul(this.battleNumber, 0x9e3779b9)) >>> 0);
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
            const originAngles = [Math.PI * 7 / 6, Math.PI * 11 / 6, Math.PI / 2];
            for (let index = originAngles.length - 1; index > 0; index -= 1) {
                const swapIndex = Math.floor(this.random.next() * (index + 1));
                [originAngles[index], originAngles[swapIndex]] = [originAngles[swapIndex], originAngles[index]];
            }
            this.factionOriginAngles = Object.fromEntries(FACTIONS.map((faction, index) => [faction, originAngles[index]]));
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

        chooseFaction(type, index = 0, useAutoBalance = true) {
            const enabled = FACTIONS.filter((faction) => this.definitionsFor(type, faction).length > 0);
            if (!enabled.length) return null;
            const totalScore = FACTIONS.reduce((total, faction) => total + this.stats.factions[faction].score, 0);
            if (!useAutoBalance || !this.settings.autoBalance || totalScore < 10) return enabled[index % enabled.length];
            const weights = this.factionSpawnWeights();
            const weightedFactions = ["earth", "eridani", "gliese"].filter((faction) => enabled.includes(faction));
            const totalWeight = weightedFactions.reduce((total, faction) => total + Math.max(0, weights[faction]), 0);
            if (!totalWeight) return enabled[index % enabled.length];
            let selection = this.random.next() * totalWeight;
            for (const faction of weightedFactions) {
                selection -= Math.max(0, weights[faction]);
                if (selection < 0) return faction;
            }
            return weightedFactions[weightedFactions.length - 1];
        }

        factionSpawnWeights() {
            const totalScore = FACTIONS.reduce((total, faction) => total + this.stats.factions[faction].score, 0);
            if (!totalScore) return Object.fromEntries(FACTIONS.map((faction) => [faction, 1]));
            const weights = Object.fromEntries(FACTIONS.map((faction) => [
                faction,
                Math.floor((100 - Math.floor(this.stats.factions[faction].score * 100 / totalScore)) / 2)
            ]));
            const ranked = ["earth", "eridani", "gliese"].sort((left, right) => this.stats.factions[right].score - this.stats.factions[left].score);
            const [leader, second, trailer] = ranked;
            const difference = weights[trailer] - weights[leader];
            if (difference >= 0) {
                const transfer = difference * 2;
                weights[trailer] += transfer;
                weights[leader] -= Math.floor(transfer * 0.75);
                weights[second] -= Math.floor(transfer * 0.25);
            }
            return weights;
        }

        definitionsFor(type, faction) {
            const definitions = type === "capital" ? CAPITALS[faction] : [type === "fighter" ? FIGHTERS[faction] : BOMBERS[faction]];
            return definitions.filter((definition) => this.settings[SPAWN_SETTINGS[definition.sprite]]);
        }

        spawnShip(type, faction) {
            const definitions = this.definitionsFor(type, faction);
            if (!definitions.length) return false;
            const definition = this.random.pick(definitions);
            const originAngle = this.factionOriginAngles[faction];
            const radius = Math.min(this.width, this.height) * 0.38;
            const spread = Math.min(this.width, this.height) * 0.15;
            let x = this.width / 2 + Math.cos(originAngle) * radius + this.random.range(-spread, spread);
            let y = this.height / 2 + Math.sin(originAngle) * radius + this.random.range(-spread, spread);
            const batteries = definition.randomWeapons
                ? Array.from({ length: 5 }, () => ({
                    ...EARTH_CRUISER_RANDOM_WEAPONS[Math.trunc(this.random.next() * 9 - 1)], count: 1
                }))
                : WEAPON_BATTERIES[definition.sprite].map((battery) => ({ ...battery }));
            const carrier = type === "fighter" && faction === "earth"
                ? this.ships.find((candidate) => candidate.role === "carrier" && candidate.state === "active")
                : null;
            const launchSlot = carrier
                ? this.ships.filter((candidate) => candidate.carrierId === carrier.id && candidate.state === "launching").length
                : 0;
            const angle = carrier ? carrier.angle : originAngle + Math.PI;
            if (carrier) {
                const lateralOffset = (launchSlot - 1.5) * 9;
                x = carrier.x + Math.cos(angle + Math.PI / 2) * lateralOffset;
                y = carrier.y + Math.sin(angle + Math.PI / 2) * lateralOffset;
            }
            this.ships.push({
                id: this.nextId++, type, faction, sprite: definition.sprite, engine: definition.engine,
                role: definition.carrier ? "carrier" : type === "fighter" ? "escort" : type === "capital" && batteries.some((battery) => battery.weapon === "missile") ? "artillery" : "line",
                x, y, angle, speed: carrier ? definition.speed * 0.35 : definition.speed, maxSpeed: definition.speed, turnRate: definition.turnRate,
                health: definition.hull, maxHealth: definition.hull, shield: definition.shield, maxShield: definition.shield,
                shieldRechargeDelay: 0,
                radius: type === "capital" ? 34 : type === "bomber" ? 17 : 11,
                shieldRadius: type === "capital" ? 64 : type === "bomber" ? 30 : 24,
                weaponBatteries: batteries.map((battery) => ({ ...battery })),
                weaponTimers: batteries.map((battery) => this.random.range(0, battery.cooldown)),
                weaponBursts: batteries.map((battery) => battery.burst || 1),
                fireDelay: Math.min(...batteries.map((battery) => battery.cooldown)), fireTimer: 0, targetId: 0,
                retargetTimer: this.random.range(0, 0.5), state: carrier ? "launching" : "active", deathTimer: 0,
                aiState: "engaging", attackRun: false, systems: { shields: 100, engine: 100, weapons: 100 },
                ai: { ...definition },
                ionIntegrity: definition.hull, disabledTimer: 0,
                carrierId: carrier?.id || 0, launchDelay: carrier ? launchSlot * 0.4 : 0,
                launchOffset: carrier ? (launchSlot - 1.5) * 9 : 0, launchTimer: carrier ? 0.7 : 0,
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
                if (!ship.explosionDamageApplied && ship.deathTimer >= 0.75) {
                    ship.explosionDamageApplied = true;
                    this.applyExplosionDamage(ship);
                }
                if (ship.deathTimer > 0.9) {
                    this.spawnDebris(ship);
                    ship.state = "dead";
                }
                return;
            }
            if (ship.state === "warping") {
                const direction = Math.atan2(ship.y - this.height / 2, ship.x - this.width / 2);
                ship.angle = direction;
                ship.speed = Math.min(ship.maxSpeed * 8, ship.speed + ship.maxSpeed * delta * 3);
                ship.x += Math.cos(direction) * ship.speed * delta;
                ship.y += Math.sin(direction) * ship.speed * delta;
                ship.enginePulse += delta * 16;
                return;
            }
            if (ship.state === "launching") {
                const carrier = this.ships.find((candidate) => candidate.id === ship.carrierId && candidate.state === "active");
                if (ship.launchDelay > 0 && carrier) {
                    ship.launchDelay -= delta;
                    ship.angle = carrier.angle;
                    ship.speed = carrier.speed;
                    ship.x = carrier.x + Math.cos(carrier.angle + Math.PI / 2) * ship.launchOffset;
                    ship.y = carrier.y + Math.sin(carrier.angle + Math.PI / 2) * ship.launchOffset;
                    ship.enginePulse += delta * 8;
                    return;
                }
                ship.launchDelay = 0;
                ship.launchTimer -= delta;
                ship.speed += (ship.maxSpeed - ship.speed) * Math.min(1, delta * 3);
                ship.x = ((ship.x + Math.cos(ship.angle) * ship.speed * delta) % this.width + this.width) % this.width;
                ship.y = ((ship.y + Math.sin(ship.angle) * ship.speed * delta) % this.height + this.height) % this.height;
                ship.enginePulse += delta * 14;
                if (ship.launchTimer <= 0) {
                    ship.state = "active";
                    ship.targetId = 0;
                    ship.retargetTimer = 0;
                }
                return;
            }
            if (ship.state === "disabled") {
                ship.disabledTimer -= delta;
                ship.speed *= Math.max(0, 1 - delta * 2);
                if (ship.disabledTimer <= 0) {
                    ship.state = "active";
                    ship.ionIntegrity = ship.maxHealth;
                }
                return;
            }
            ship.weaponTimers = ship.weaponTimers.map((timer) => timer - delta);
            ship.retargetTimer -= delta;
            let target = this.ships.find((candidate) => candidate.id === ship.targetId && candidate.state === "active");
            if (!target || (ship.retargetTimer <= 0 && !ship.ai.focusEngage)) {
                target = this.findTarget(ship);
                ship.targetId = target ? target.id : 0;
                ship.retargetTimer = this.random.range(0.25, 0.7);
            }
            if (!target) return;
            const offsetX = this.wrappedOffset(ship.x, target.x, this.width);
            const offsetY = this.wrappedOffset(ship.y, target.y, this.height);
            const distance = Math.hypot(offsetX, offsetY) || 1;
            const desired = Math.atan2(offsetY, offsetX);
            if (ship.ai.attackRuns && target.type === "capital" && ship.aiState === "engaging" && distance < ship.ai.attackRunDistance) {
                ship.attackRun = true;
                ship.aiState = "retreating";
            }
            if (ship.aiState === "retreating") {
                if (ship.attackRun && distance >= 400 * Math.sqrt(1.2)) {
                    ship.attackRun = false;
                    ship.aiState = "engaging";
                } else if (!ship.attackRun && ship.shield / ship.maxShield >= ship.ai.shieldAttackThreshold) {
                    ship.aiState = "engaging";
                }
            } else if (Number.isFinite(ship.ai.shieldAttackThreshold) && ship.shield <= 0) {
                ship.aiState = "retreating";
            }
            let navigationX = offsetX;
            let navigationY = offsetY;
            let idealRange = ship.ai.keepDistance ? 295 : ship.type === "capital" ? 260 : ship.type === "bomber" ? 210 : 130;
            const escortAnchor = ship.role === "escort" ? this.findEscortAnchor(ship) : null;
            if (escortAnchor) {
                const anchorX = this.wrappedOffset(ship.x, escortAnchor.x, this.width);
                const anchorY = this.wrappedOffset(ship.y, escortAnchor.y, this.height);
                const targetFromAnchorX = this.wrappedOffset(escortAnchor.x, target.x, this.width);
                const targetFromAnchorY = this.wrappedOffset(escortAnchor.y, target.y, this.height);
                const threatDistance = Math.hypot(targetFromAnchorX, targetFromAnchorY);
                const escortDistance = Math.hypot(anchorX, anchorY);
                if (threatDistance > 420 || escortDistance > 300) {
                    const slotAngle = ship.id * 2.399963229728653;
                    navigationX = anchorX + Math.cos(slotAngle) * 150;
                    navigationY = anchorY + Math.sin(slotAngle) * 150;
                    idealRange = 45;
                } else {
                    idealRange = 150;
                }
            } else if (ship.role === "artillery" || ship.role === "carrier") {
                idealRange = ship.role === "carrier" ? 340 : 360;
                if (distance < idealRange * 0.9) {
                    navigationX = -offsetX;
                    navigationY = -offsetY;
                } else if (distance <= idealRange * 1.1) {
                    const orbitDirection = ship.id % 2 ? 1 : -1;
                    navigationX = -offsetY * orbitDirection;
                    navigationY = offsetX * orbitDirection;
                }
            } else if (!ship.ai.straightAttackPath && distance < 320) {
                const approachAngle = desired + Math.PI / 4;
                navigationX = Math.cos(approachAngle) * distance;
                navigationY = Math.sin(approachAngle) * distance;
            }
            const navigationGoalDistance = Math.hypot(navigationX, navigationY) || 1;
            const navigationScale = Math.min(1, 160 / navigationGoalDistance);
            navigationX *= navigationScale;
            navigationY *= navigationScale;
            const separationRange = ship.type === "capital" ? 190 : ship.type === "bomber" ? 110 : 95;
            for (const ally of this.ships) {
                if (ally === ship || ally.faction !== ship.faction || !["active", "disabled"].includes(ally.state)) continue;
                const allyX = this.wrappedOffset(ship.x, ally.x, this.width);
                const allyY = this.wrappedOffset(ship.y, ally.y, this.height);
                const allyDistance = Math.hypot(allyX, allyY);
                if (allyDistance <= 0 || allyDistance >= separationRange) continue;
                const separation = (separationRange - allyDistance) * 4 / allyDistance;
                navigationX -= allyX * separation;
                navigationY -= allyY * separation;
            }
            const navigationDistance = Math.hypot(navigationX, navigationY) || 1;
            const navigationAngle = Math.atan2(navigationY, navigationX);
            const targetAngle = ship.aiState === "retreating" ? desired + Math.PI : navigationAngle;
            let angleDelta = ((targetAngle - ship.angle + Math.PI * 3) % TWO_PI) - Math.PI;
            ship.angle += Math.max(-ship.turnRate * delta, Math.min(ship.turnRate * delta, angleDelta));
            const thrust = ship.aiState === "retreating" || ship.role === "artillery" || ship.role === "carrier" || escortAnchor
                ? 1
                : navigationGoalDistance > idealRange ? 1 : navigationGoalDistance < idealRange * 0.55 ? -0.35 : 0.2;
            const engineFactor = 0.35 + ship.systems.engine / 100 * 0.65;
            ship.speed += (ship.maxSpeed * engineFactor * thrust - ship.speed) * Math.min(1, delta * 2.5);
            ship.x += Math.cos(ship.angle) * ship.speed * delta;
            ship.y += Math.sin(ship.angle) * ship.speed * delta;
            ship.x = ((ship.x % this.width) + this.width) % this.width;
            ship.y = ((ship.y % this.height) + this.height) % this.height;
            ship.shieldRechargeDelay = Math.max(0, ship.shieldRechargeDelay - delta);
            if (ship.shieldRechargeDelay === 0) {
                const rechargeRate = ship.type === "capital" ? 20 : ship.type === "bomber" ? 10 : 5;
                ship.shield = Math.min(ship.maxShield, ship.shield + rechargeRate * (ship.systems.shields / 100) * delta);
            }
            const weaponRange = ship.role === "artillery" ? 500 : 400;
            if (ship.aiState === "engaging" && ship.systems.weapons > 0 && distance < weaponRange) this.updateWeaponSystems(ship, target, desired);
            ship.fireTimer = Math.min(...ship.weaponTimers);
            ship.enginePulse += delta * 8;
        }

        findTarget(ship) {
            const freeForAll = this.settings.simulationMode === "freeforall";
            const escortAnchor = ship.role === "escort" ? this.findEscortAnchor(ship) : null;
            let closest = null;
            let closestDistance = Infinity;
            let closestThreatensAnchor = false;
            for (const candidate of this.ships) {
                if (candidate === ship || !["active", "disabled"].includes(candidate.state)) continue;
                if (!freeForAll && candidate.faction === ship.faction) continue;
                const offsetX = this.wrappedOffset(ship.x, candidate.x, this.width);
                const offsetY = this.wrappedOffset(ship.y, candidate.y, this.height);
                const distance = offsetX ** 2 + offsetY ** 2;
                const threatensAnchor = Boolean(escortAnchor && Math.hypot(
                    this.wrappedOffset(escortAnchor.x, candidate.x, this.width),
                    this.wrappedOffset(escortAnchor.y, candidate.y, this.height)
                ) <= 340);
                const candidatePreferred = Boolean(ship.ai.preferHullDamage && candidate.shield <= 0);
                const closestPreferred = Boolean(closest && ship.ai.preferHullDamage && closest.shield <= 0);
                if ((!closestThreatensAnchor && threatensAnchor)
                    || (threatensAnchor === closestThreatensAnchor && ((!closestPreferred && candidatePreferred)
                    || (candidatePreferred === closestPreferred && distance < closestDistance)))) {
                    closest = candidate;
                    closestDistance = distance;
                    closestThreatensAnchor = threatensAnchor;
                }
            }
            return closest;
        }

        findEscortAnchor(ship) {
            const activeCarrier = this.ships.find((candidate) => candidate.faction === ship.faction && candidate.role === "carrier" && candidate.state === "active");
            if (activeCarrier) return activeCarrier;
            let closest = null;
            let closestDistance = Infinity;
            for (const candidate of this.ships) {
                if (candidate.faction !== ship.faction || candidate.type !== "capital" || candidate.state !== "active") continue;
                const distance = this.wrappedOffset(ship.x, candidate.x, this.width) ** 2
                    + this.wrappedOffset(ship.y, candidate.y, this.height) ** 2;
                if (distance < closestDistance) {
                    closest = candidate;
                    closestDistance = distance;
                }
            }
            return closest;
        }

        fire(ship, target) {
            const batteries = ship.weaponBatteries || WEAPON_BATTERIES[ship.sprite] || [{ weapon: "laser", count: 1, damage: 8 }];
            const aimAngle = Math.atan2(
                this.wrappedOffset(ship.y, target.y, this.height),
                this.wrappedOffset(ship.x, target.x, this.width)
            );
            for (const battery of batteries) this.fireBattery(ship, target, battery, aimAngle);
        }

        updateWeaponSystems(ship, target, aimAngle) {
            const batteries = ship.weaponBatteries;
            const weaponFactor = 2 - ship.systems.weapons / 100;
            for (let index = 0; index < batteries.length; index += 1) {
                const battery = batteries[index];
                const pointDelta = Math.abs(((aimAngle - ship.angle + Math.PI * 3) % TWO_PI) - Math.PI);
                if (ship.weaponTimers[index] > 0 || (battery.mount === "point" && battery.weapon !== "missile" && pointDelta > Math.PI / 9)) continue;
                this.fireBattery(ship, target, battery, aimAngle);
                if (battery.burst) {
                    ship.weaponBursts[index] -= 1;
                    if (ship.weaponBursts[index] > 0) {
                        ship.weaponTimers[index] = battery.cooldown * weaponFactor;
                    } else {
                        ship.weaponBursts[index] = battery.burst;
                        ship.weaponTimers[index] = battery.burstCooldown * weaponFactor;
                    }
                } else {
                    ship.weaponTimers[index] = battery.cooldown * weaponFactor;
                }
            }
        }

        fireBattery(ship, target, battery, aimAngle = ship.angle) {
            const weapon = battery.secondary && target.shield <= 0 ? battery.secondary : battery.weapon;
            if (weapon === "none") return;
            for (let index = 0; index < battery.count; index += 1) {
                const center = (battery.count - 1) / 2;
                const mountAngle = battery.mount === "turret" || weapon === "missile" ? aimAngle : ship.angle;
                const inaccuracy = battery.mount === "turret" && weapon !== "beam" ? this.random.range(-Math.PI / 18, Math.PI / 18) : 0;
                const angle = mountAngle + inaccuracy;
                this.fireProjectile(ship, target, weapon, battery.damage, angle, index - center);
            }
        }

        fireProjectile(ship, target, weapon, damage, angle, lateralOffset) {
            const missile = weapon === "missile";
            const speed = missile ? 250 : ship.type === "fighter" ? 750 : 500;
            const color = weapon === "ion" ? "#35a8ff" : ship.faction === "earth" ? "#76d7ff" : ship.faction === "gliese" ? "#ff6659" : "#7dffad";
            this.stats.factions[ship.faction].projectilesSpawned += 1;
            if (weapon === "beam") {
                this.stats.factions[ship.faction].projectilesHit += 1;
                this.effects.push({
                    kind: "beam",
                    x: ship.x + Math.cos(ship.angle + Math.PI / 2) * lateralOffset * 4,
                    y: ship.y + Math.sin(ship.angle + Math.PI / 2) * lateralOffset * 4,
                    targetX: ship.x + this.wrappedOffset(ship.x, target.x, this.width),
                    targetY: ship.y + this.wrappedOffset(ship.y, target.y, this.height),
                    targetId: target.id, faction: ship.faction, damageRate: damage / (ship.type === "bomber" ? 0.1 : 1),
                    age: 0, life: ship.type === "bomber" ? 0.1 : 1, size: ship.type === "bomber" ? 2 : 3, color
                });
                return;
            }
            const sideX = Math.cos(ship.angle + Math.PI / 2) * lateralOffset * 4;
            const sideY = Math.sin(ship.angle + Math.PI / 2) * lateralOffset * 4;
            this.projectiles.push({
                x: ship.x + Math.cos(angle) * ship.radius + sideX,
                y: ship.y + Math.sin(angle) * ship.radius + sideY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                angle,
                targetId: target.id,
                sourceId: ship.id,
                faction: ship.faction,
                damage,
                shieldDamage: weapon === "ion" ? 2 : 1,
                hullDamage: missile ? 2 : weapon === "ion" ? 0 : 1,
                life: 5,
                missile,
                weapon,
                size: missile ? (ship.type === "capital" ? 22 : 16) : weapon === "ion" ? 12 : ship.type === "fighter" ? 12 : 18,
                color
            });
        }

        updateProjectiles(delta) {
            for (const projectile of this.projectiles) {
                projectile.life -= delta;
                if (projectile.missile) {
                    let target = this.ships.find((ship) => ship.id === projectile.targetId && ["active", "disabled"].includes(ship.state));
                    if (!target) {
                        const freeForAll = this.settings.simulationMode === "freeforall";
                        target = this.ships
                            .filter((ship) => ["active", "disabled"].includes(ship.state)
                                && ship.id !== projectile.sourceId
                                && (freeForAll || ship.faction !== projectile.faction))
                            .sort((left, right) => {
                                const leftDistance = this.wrappedOffset(projectile.x, left.x, this.width) ** 2 + this.wrappedOffset(projectile.y, left.y, this.height) ** 2;
                                const rightDistance = this.wrappedOffset(projectile.x, right.x, this.width) ** 2 + this.wrappedOffset(projectile.y, right.y, this.height) ** 2;
                                return leftDistance - rightDistance;
                            })[0];
                        projectile.targetId = target?.id || 0;
                    }
                    if (target) {
                        const desired = Math.atan2(
                            this.wrappedOffset(projectile.y, target.y, this.height),
                            this.wrappedOffset(projectile.x, target.x, this.width)
                        );
                        let turn = ((desired - projectile.angle + Math.PI * 3) % TWO_PI) - Math.PI;
                        const missileTurnRate = Math.PI * 5 / 6;
                        projectile.angle += Math.max(-missileTurnRate * delta, Math.min(missileTurnRate * delta, turn));
                        const speed = Math.hypot(projectile.vx, projectile.vy);
                        projectile.vx = Math.cos(projectile.angle) * speed;
                        projectile.vy = Math.sin(projectile.angle) * speed;
                    }
                    this.effects.push({ kind: "smoke", x: projectile.x, y: projectile.y, age: 0, life: 0.45, size: 5 });
                }
                projectile.x = ((projectile.x + projectile.vx * delta) % this.width + this.width) % this.width;
                projectile.y = ((projectile.y + projectile.vy * delta) % this.height + this.height) % this.height;
                const target = this.ships.find((ship) => {
                    if (!["active", "disabled"].includes(ship.state)) return false;
                    if (ship.id === projectile.sourceId) return false;
                    if (this.settings.simulationMode !== "freeforall" && ship.faction === projectile.faction) return false;
                    const collisionRadius = ship.state === "active" && ship.shield > 0 ? ship.shieldRadius : ship.radius;
                    return Math.hypot(
                        this.wrappedOffset(projectile.x, ship.x, this.width),
                        this.wrappedOffset(projectile.y, ship.y, this.height)
                    ) < collisionRadius + 5;
                });
                if (target) {
                    this.damageShip(target, projectile.damage, projectile.faction, projectile.shieldDamage, projectile.hullDamage, projectile.weapon);
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

        wrappedOffset(from, to, size) {
            const offset = to - from;
            if (offset > size / 2) return offset - size;
            if (offset < -size / 2) return offset + size;
            return offset;
        }

        damageShip(ship, damage, attackingFaction = null, shieldMultiplier = 1, hullMultiplier = 1, weapon = null) {
            const hadShield = ship.state === "active" && ship.shield > 0;
            const shieldDamage = hadShield ? Math.min(ship.shield, damage * shieldMultiplier) : 0;
            ship.shield -= shieldDamage;
            if (hadShield && ship.shield <= 0) {
                ship.shield = 0;
                ship.shieldRechargeDelay = 3;
                this.stats.factions[ship.faction].shieldCollapses += 1;
            }
            const remainingDamage = hadShield ? 0 : damage;
            const hullDamage = remainingDamage * hullMultiplier;
            ship.health -= hullDamage;
            if (weapon === "ion" && !hadShield) {
                ship.ionIntegrity -= damage;
                ship.systems.weapons = Math.max(0, ship.systems.weapons - damage * 1.5);
                if (ship.ionIntegrity <= 0 && ship.state === "active") {
                    ship.state = "disabled";
                    ship.disabledTimer = 5;
                    ship.speed *= 0.2;
                }
            }
            if (hullDamage > 0 && this.random.next() < 0.3) {
                const systemName = this.random.pick(["shields", "engine", "weapons"]);
                const previous = ship.systems[systemName];
                ship.systems[systemName] = Math.max(0, previous - hullDamage * 0.8);
                if (previous > 0 && ship.systems[systemName] === 0) {
                    this.stats.factions[ship.faction].systemsDestroyed += 1;
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
            ship.explosionDamageApplied = false;
            this.stats.factions[ship.faction].deaths += 1;
            const bursts = ship.type === "capital" ? 9 : 4;
            for (let index = 0; index < bursts; index += 1) {
                this.effects.push({
                    kind: "explosion", x: ship.x + this.random.range(-ship.radius, ship.radius),
                    y: ship.y + this.random.range(-ship.radius, ship.radius), age: -index * 0.045,
                    life: 0.75, size: this.random.range(18, ship.type === "capital" ? 56 : 32)
                });
            }
            return true;
        }

        applyExplosionDamage(ship) {
            const radius = ship.type === "capital" ? 128 : 48;
            const damage = ship.type === "capital" ? 96 : 36;
            for (const target of this.ships) {
                if (target === ship || !["active", "disabled"].includes(target.state)) continue;
                if (this.settings.simulationMode !== "freeforall" && target.faction === ship.faction) continue;
                if (Math.hypot(
                    this.wrappedOffset(ship.x, target.x, this.width),
                    this.wrappedOffset(ship.y, target.y, this.height)
                ) < radius) this.damageShip(target, damage, ship.faction, 1, 2, "missile");
            }
        }

        spawnDebris(ship) {
            if (!this.settings.debris) return;
            const fighterClass = ship.type !== "capital";
            const minimum = fighterClass ? 2 : 3;
            const maximum = fighterClass ? 5 : 10;
            const count = minimum + Math.floor(this.random.next() * (maximum - minimum + 1));
            for (let index = 0; index < count; index += 1) {
                const movingForward = ship.speed > 0;
                const speed = this.random.range(0, movingForward ? ship.speed : ship.maxSpeed);
                const angle = movingForward ? ship.angle + this.random.range(-Math.PI / 4, Math.PI / 4) : this.random.range(0, TWO_PI);
                this.effects.push({
                    kind: "debris", x: ship.x + this.random.range(-ship.radius, ship.radius),
                    y: ship.y + this.random.range(-ship.radius, ship.radius), age: 0, life: 5,
                    size: this.random.range(5, 12), vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed, angle, spin: this.random.range(-4, 4),
                    sprite: `ship_debris_${1 + Math.floor(this.random.next() * 3)}.png`
                });
            }
        }

        updateEffects(delta) {
            for (const effect of this.effects) {
                effect.age += delta;
                if (effect.kind === "beam") {
                    const target = this.ships.find((ship) => ship.id === effect.targetId && ["active", "disabled"].includes(ship.state));
                    if (target) {
                        effect.targetX = effect.x + this.wrappedOffset(effect.x, target.x, this.width);
                        effect.targetY = effect.y + this.wrappedOffset(effect.y, target.y, this.height);
                        this.damageShip(target, effect.damageRate * delta, effect.faction, 1, 1, "beam");
                    }
                }
                if (effect.kind === "debris") {
                    effect.x += effect.vx * delta;
                    effect.y += effect.vy * delta;
                    effect.angle += effect.spin * delta;
                    effect.x = ((effect.x % this.width) + this.width) % this.width;
                    effect.y = ((effect.y % this.height) + this.height) % this.height;
                    const target = this.ships.find((ship) => {
                        if (!["active", "disabled"].includes(ship.state)) return false;
                        const collisionRadius = ship.state === "active" && ship.shield > 0 ? ship.shieldRadius : ship.radius;
                        return Math.hypot(
                            this.wrappedOffset(effect.x, ship.x, this.width),
                            this.wrappedOffset(effect.y, ship.y, this.height)
                        ) < collisionRadius;
                    });
                    if (target) {
                        this.damageShip(target, 5, null, 1, 1, "debris");
                        effect.age = effect.life;
                    }
                }
            }
            this.effects = this.effects.filter((effect) => effect.age < effect.life);
        }

        replenishShips() {
            const expected = { capital: Math.round(this.settings.capitalShips), fighter: Math.round(this.settings.fighters), bomber: Math.round(this.settings.bombers) };
            for (const type of Object.keys(expected)) {
                const active = this.ships.filter((ship) => ship.type === type && ship.state !== "dead").length;
                if (active < expected[type] && this.random.next() < 0.018) {
                    const faction = this.chooseFaction(type, active, false);
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
                const ship = this.ships.find((candidate) => {
                    if (!["active", "disabled"].includes(candidate.state)) return false;
                    const collisionRadius = candidate.state === "active" && candidate.shield > 0 ? candidate.shieldRadius : candidate.radius;
                    return Math.hypot(
                        this.wrappedOffset(x, candidate.x, this.width),
                        this.wrappedOffset(y, candidate.y, this.height)
                    ) < collisionRadius + asteroid.size / 2;
                });
                if (ship) {
                    this.damageShip(ship, 7, null, 1, 1.2, "asteroid");
                    asteroid.hitTimer = 0.75;
                    this.effects.push({ kind: "hit", x, y, age: 0, life: 0.25, size: 12, color: "#c8bba4" });
                }
            }
        }

        processBattleState(delta) {
            if (this.settings.simulationMode === "noships" || this.settings.simulationMode === "freeforall") return;
            if (this.battleState === "warp") {
                this.battleTimer -= delta;
                if (this.battleTimer <= 0) this.restart();
                return;
            }
            const activeFactions = [...new Set(this.ships.filter((ship) => ["active", "disabled"].includes(ship.state)).map((ship) => ship.faction))];
            const remainingShips = this.ships.filter((ship) => ["active", "disabled", "exploding"].includes(ship.state));
            if (remainingShips.length && activeFactions.length > 1) return;
            const winner = activeFactions[0];
            if (winner) this.stats.factions[winner].score += 1;
            for (const ship of this.ships) {
                if (["active", "disabled"].includes(ship.state)) {
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
                const distance = Math.hypot(
                    this.wrappedOffset(x, ship.x, this.width),
                    this.wrappedOffset(y, ship.y, this.height)
                );
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