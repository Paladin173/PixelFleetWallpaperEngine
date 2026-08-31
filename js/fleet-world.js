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
            this.nextId = 1;
            this.slowScale = 1;
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
            const restartKeys = ["simulationMode", "capitalShips", "fighters", "bombers", "asteroids", "backgroundDetail"];
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
            this.nextId = 1;
            const asteroidCount = Math.max(0, Math.min(200, Math.round(this.settings.asteroids)));
            for (let index = 0; index < asteroidCount; index += 1) {
                this.asteroids.push({
                    x: this.random.next(), y: this.random.next(),
                    size: this.random.range(8, 22), angle: this.random.range(0, TWO_PI),
                    spin: this.random.range(-0.12, 0.12), sprite: `asteroid_${1 + Math.floor(this.random.next() * 3)}.png`
                });
            }
            const showDetail = this.settings.backgroundDetail === "always" ||
                (this.settings.backgroundDetail === "random" && this.random.next() > 0.25);
            if (showDetail) {
                this.decorations.push({ sprite: "nebula.png", x: 0.2, y: 0.25, size: 520, alpha: 0.13, angle: 0.2 });
                this.decorations.push({ sprite: this.random.pick(["habitable_planet.png", "gas_planet.png", "gas_ring_planet.png", "rock_planet.png"]), x: 0.82, y: 0.22, size: 120, alpha: 0.8, angle: -0.15 });
            }
            if (this.settings.simulationMode !== "noships") {
                this.spawnGroup("capital", Math.round(this.settings.capitalShips));
                this.spawnGroup("fighter", Math.round(this.settings.fighters));
                this.spawnGroup("bomber", Math.round(this.settings.bombers));
            }
        }

        spawnGroup(type, count) {
            const limit = type === "fighter" ? 30 : 20;
            for (let index = 0; index < Math.max(0, Math.min(limit, count)); index += 1) {
                this.spawnShip(type, FACTIONS[index % FACTIONS.length]);
            }
        }

        spawnShip(type, faction) {
            let definition;
            if (type === "capital") definition = this.random.pick(CAPITALS[faction]);
            else definition = type === "fighter" ? FIGHTERS[faction] : BOMBERS[faction];
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
                enginePulse: this.random.range(0, TWO_PI)
            });
        }

        update(delta) {
            const hasExplosions = this.effects.some((effect) => effect.kind === "explosion" && effect.age < 0.65);
            const targetScale = this.settings.slowMotion && hasExplosions ? 0.25 : 1;
            this.slowScale += (targetScale - this.slowScale) * Math.min(1, delta * 4);
            const step = delta * this.slowScale;
            this.time += step;
            for (const asteroid of this.asteroids) asteroid.angle += asteroid.spin * step;
            for (const ship of this.ships) this.updateShip(ship, step);
            this.updateProjectiles(step);
            this.updateEffects(step);
            this.ships = this.ships.filter((ship) => ship.state !== "dead");
            if (this.settings.simulationMode === "galacticwar" || this.settings.simulationMode === "freeforall") {
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
            let angleDelta = ((desired - ship.angle + Math.PI * 3) % TWO_PI) - Math.PI;
            const turnRate = ship.type === "fighter" ? 2.9 : ship.type === "bomber" ? 1.8 : 0.72;
            ship.angle += Math.max(-turnRate * delta, Math.min(turnRate * delta, angleDelta));
            const idealRange = ship.type === "capital" ? 260 : ship.type === "bomber" ? 210 : 130;
            const thrust = distance > idealRange ? 1 : distance < idealRange * 0.55 ? -0.35 : 0.2;
            ship.speed += (ship.maxSpeed * thrust - ship.speed) * Math.min(1, delta * 2.5);
            ship.x += Math.cos(ship.angle) * ship.speed * delta;
            ship.y += Math.sin(ship.angle) * ship.speed * delta;
            ship.x = ((ship.x % this.width) + this.width) % this.width;
            ship.y = ((ship.y % this.height) + this.height) % this.height;
            ship.shield = Math.min(ship.maxShield, ship.shield + ship.maxShield * 0.025 * delta);
            ship.fireTimer -= delta;
            if (ship.fireTimer <= 0 && distance < (ship.type === "capital" ? 520 : 340) && Math.abs(angleDelta) < 0.55) {
                this.fire(ship, target);
                ship.fireTimer = (ship.type === "fighter" ? 0.48 : ship.type === "bomber" ? 1.2 : 0.72) * this.random.range(0.8, 1.25);
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
            const missile = ship.type === "bomber" || ship.sprite.includes("missile");
            const speed = missile ? 255 : ship.type === "fighter" ? 490 : 420;
            const color = ship.faction === "earth" ? "#76d7ff" : ship.faction === "gliese" ? "#ff6659" : "#7dffad";
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
                    this.damageShip(target, projectile.damage);
                    projectile.life = 0;
                    this.effects.push({ kind: "hit", x: projectile.x, y: projectile.y, age: 0, life: 0.28, size: projectile.missile ? 26 : 13, color: projectile.color });
                }
            }
            this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && projectile.x > -100 && projectile.y > -100 && projectile.x < this.width + 100 && projectile.y < this.height + 100);
        }

        damageShip(ship, damage) {
            const shieldDamage = Math.min(ship.shield, damage);
            ship.shield -= shieldDamage;
            ship.health -= damage - shieldDamage;
            if (ship.health <= 0) this.destroyShip(ship);
        }

        destroyShip(ship) {
            if (!ship || ship.state !== "active") return false;
            ship.state = "exploding";
            ship.deathTimer = 0;
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
                if (active < expected[type] && this.random.next() < 0.018) this.spawnShip(type, this.random.pick(FACTIONS));
            }
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