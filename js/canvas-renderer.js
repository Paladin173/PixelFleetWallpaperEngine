(function () {
    "use strict";

    const ASSETS = [
        "static_bg.png", "nebula.png", "habitable_planet.png", "gas_planet.png", "gas_ring_planet.png", "rock_planet.png",
        "asteroid_1.png", "asteroid_2.png", "asteroid_3.png", "ship_debris_1.png", "ship_debris_2.png", "ship_debris_3.png",
        "cruiser_1_4x.png", "cruiser_1_engine_4x.png", "earth_missile_cruiser_4x.png", "earth_missile_cruiser_engines_4x.png",
        "gliese_dreadnaught_4x.png", "gliese_dreadnaught_engine_4x.png", "gliese_corvette.png", "gliese_corvette_engine.png",
        "epsilon_eridani_gunboat.png", "epsilon_eridani_gunboat_engine.png", "epsilon_eridani_destroyer.png", "epsilon_eridani_destroyer_engine.png",
        "earth_fighter.png", "earth_fighter_engine.png", "gliese_fighter.png", "gliese_fighter_engine.png", "eridani_fighter.png", "eridani_fighter_engine.png",
        "earth_bomber.png", "earth_bomber_engine.png", "gliese_bomber.png", "gliese_bomber_engine.png", "eridani_bomber.png", "eridani_bomber_engine.png",
        "shield_cruiser_class_4x.png", "shield_fighter_class.png", "shield_bomber_class.png", "missile2_4x.png",
        "warp.png", "laser_4x.png", "ball_laser_2x.png", "arc.png"
    ];
    const FACTION_COLORS = { earth: "#f4f7fb", gliese: "#ff3028", eridani: "#278dff" };
    const ENGINE_COLORS = {
        earth: { outer: "#4bbcff", inner: "#e8fbff" },
        gliese: { outer: "#ff3d24", inner: "#ffd06a" },
        eridani: { outer: "#ffb000", inner: "#fff2a6" }
    };

    class CanvasRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
            this.images = new Map();
            this.tintedImages = new Map();
            this.quality = "auto";
            this.cssWidth = 1;
            this.cssHeight = 1;
            this.scaleX = 1;
            this.scaleY = 1;
            this.ready = this.loadAssets();
        }

        async loadAssets() {
            await Promise.all(ASSETS.map((name) => new Promise((resolve) => {
                const image = new Image();
                image.onload = () => { this.images.set(name, image); resolve(); };
                image.onerror = resolve;
                image.src = `assets/${name}`;
            })));
        }

        setQuality(quality) {
            this.quality = quality;
        }

        resize(width, height) {
            this.cssWidth = Math.max(1, width);
            this.cssHeight = Math.max(1, height);
            const nativeScale = Math.min(window.devicePixelRatio || 1, 2);
            const budgetScale = Math.min(1, Math.sqrt(8294400 / (width * height * nativeScale * nativeScale)));
            const qualityScale = this.quality === "high" ? nativeScale : this.quality === "balanced" ? Math.min(nativeScale, 0.8) : this.quality === "performance" ? Math.min(nativeScale, 0.55) : nativeScale * budgetScale;
            this.canvas.width = Math.max(1, Math.round(width * qualityScale));
            this.canvas.height = Math.max(1, Math.round(height * qualityScale));
            this.scaleX = this.canvas.width / width;
            this.scaleY = this.canvas.height / height;
            this.context.imageSmoothingEnabled = false;
        }

        draw(world, settings, fps) {
            const context = this.context;
            const scaleX = this.canvas.width / world.width;
            const scaleY = this.canvas.height / world.height;
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.globalAlpha = 1;
            context.globalCompositeOperation = "source-over";
            context.fillStyle = "#000006";
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            const background = this.images.get("static_bg.png");
            if (world.background.stars && background) context.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);
            context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            for (const decoration of world.decorations) this.drawDecoration(context, decoration, world);
            this.drawSpaceDust(context, world);
            for (const asteroid of world.asteroids) this.drawSprite(context, asteroid.sprite, asteroid.x * world.width, asteroid.y * world.height, asteroid.angle, asteroid.size, 0.55);
            for (const effect of world.effects.filter((item) => item.kind === "debris")) this.drawSprite(context, effect.sprite, effect.x, effect.y, effect.angle, effect.size, Math.max(0, 1 - effect.age / effect.life));
            for (const ship of world.ships) this.drawShip(context, ship, world);
            for (const effect of world.effects.filter((item) => item.kind === "smoke")) this.drawEffect(context, effect);
            this.drawProjectiles(context, world.projectiles);
            for (const effect of world.effects.filter((item) => item.kind !== "debris" && item.kind !== "smoke")) this.drawEffect(context, effect);
            this.drawDebug(context, world, settings);
            context.setTransform(1, 0, 0, 1, 0, 0);
            this.drawUi(context, world, settings, fps);
            if (settings.brightness !== 100) {
                if (settings.brightness < 100) {
                    context.fillStyle = `rgba(0,0,0,${1 - settings.brightness / 100})`;
                    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                } else {
                    context.globalCompositeOperation = "screen";
                    context.fillStyle = `rgba(255,255,255,${Math.min(0.35, (settings.brightness - 100) / 250)})`;
                    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    context.globalCompositeOperation = "source-over";
                }
            }
        }

        drawDecoration(context, decoration, world) {
            const image = this.images.get(decoration.sprite);
            if (!image) return;
            context.save();
            context.globalAlpha = decoration.alpha;
            context.translate(decoration.x * world.width, decoration.y * world.height);
            context.rotate(decoration.angle);
            const aspect = image.width / image.height;
            context.drawImage(image, -decoration.size * aspect / 2, -decoration.size / 2, decoration.size * aspect, decoration.size);
            context.restore();
        }

        drawShip(context, ship, world) {
            if (ship.state === "launching" && ship.launchDelay > 0) return;
            const horizontalOffsets = [0];
            const verticalOffsets = [0];
            const margin = ship.radius * 5;
            if (ship.state === "active" && ship.x < margin) horizontalOffsets.push(world.width);
            if (ship.state === "active" && ship.x > world.width - margin) horizontalOffsets.push(-world.width);
            if (ship.state === "active" && ship.y < margin) verticalOffsets.push(world.height);
            if (ship.state === "active" && ship.y > world.height - margin) verticalOffsets.push(-world.height);
            for (const offsetX of horizontalOffsets) {
                for (const offsetY of verticalOffsets) this.drawShipAt(context, ship, ship.x + offsetX, ship.y + offsetY);
            }
        }

        drawShipAt(context, ship, x, y) {
            const pulse = 0.72 + Math.sin(ship.enginePulse) * 0.2;
            if (ship.state === "warping") this.drawWarp(context, x, y, ship.angle, ship.radius, pulse);
            if (["active", "launching", "warping"].includes(ship.state)) this.drawEngineExhaust(context, ship, x, y, pulse);
            if (["active", "launching", "warping"].includes(ship.state)) this.drawSprite(context, ship.engine, x, y, ship.angle + Math.PI / 2, null, pulse);
            const alpha = ship.state === "exploding" ? Math.max(0, 1 - ship.deathTimer / 0.9) : 1;
            this.drawTintedSprite(context, ship.sprite, ship.faction, x, y, ship.angle + Math.PI / 2, null, alpha);
            if (ship.shield < ship.maxShield && ship.shield > 0) {
                const shieldName = ship.type === "capital" ? "shield_cruiser_class_4x.png" : ship.type === "bomber" ? "shield_bomber_class.png" : "shield_fighter_class.png";
                this.drawSprite(context, shieldName, x, y, ship.angle + Math.PI / 2, ship.radius * 2.45, 0.1 + 0.18 * (ship.shield / ship.maxShield), true);
            }
        }

        drawEngineExhaust(context, ship, x, y, pulse) {
            const colors = ENGINE_COLORS[ship.faction] || ENGINE_COLORS.earth;
            const throttle = Math.min(1.5, Math.abs(ship.speed) / Math.max(1, ship.maxSpeed));
            const warpScale = ship.state === "warping" ? 2.2 : 1;
            const length = ship.radius * (0.7 + throttle * 0.8) * pulse * warpScale;
            const nozzleX = -ship.radius * 0.62;
            const nozzleOffsets = ship.type === "fighter" ? [0] : [-ship.radius * 0.28, ship.radius * 0.28];
            context.save();
            context.translate(x, y);
            context.rotate(ship.angle);
            context.globalCompositeOperation = "lighter";
            for (const offset of nozzleOffsets) {
                context.globalAlpha = 0.48 + pulse * 0.25;
                context.fillStyle = colors.outer;
                context.beginPath();
                context.moveTo(nozzleX, offset - ship.radius * 0.16);
                context.lineTo(nozzleX - length, offset);
                context.lineTo(nozzleX, offset + ship.radius * 0.16);
                context.closePath();
                context.fill();
                context.globalAlpha = 0.8;
                context.fillStyle = colors.inner;
                context.beginPath();
                context.moveTo(nozzleX, offset - ship.radius * 0.07);
                context.lineTo(nozzleX - length * 0.58, offset);
                context.lineTo(nozzleX, offset + ship.radius * 0.07);
                context.closePath();
                context.fill();
            }
            context.restore();
        }

        tintedSprite(name, faction) {
            const image = this.images.get(name);
            const color = FACTION_COLORS[faction];
            if (!image || !color) return image;
            const key = `${name}:${faction}`;
            if (this.tintedImages.has(key)) return this.tintedImages.get(key);
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d");
            context.imageSmoothingEnabled = false;
            context.drawImage(image, 0, 0);
            context.globalCompositeOperation = "source-atop";
            context.globalAlpha = faction === "earth" ? 0.28 : 0.42;
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            this.tintedImages.set(key, canvas);
            return canvas;
        }

        drawTintedSprite(context, name, faction, x, y, angle, targetSize, alpha) {
            const image = this.tintedSprite(name, faction);
            if (!image) return;
            this.drawImage(context, image, x, y, angle, targetSize, alpha);
        }

        drawWarp(context, x, y, angle, radius, alpha) {
            const size = radius * 2.25;
            const gradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
            gradient.addColorStop(0, "rgba(225,245,255,0.9)");
            gradient.addColorStop(0.3, "rgba(100,190,255,0.55)");
            gradient.addColorStop(1, "rgba(40,120,255,0)");
            context.save();
            context.globalCompositeOperation = "lighter";
            context.globalAlpha = alpha;
            context.translate(x, y);
            context.rotate(angle);
            context.scale(1.8, 0.45);
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(0, 0, size, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        drawProjectiles(context, projectiles) {
            context.save();
            for (const projectile of projectiles) {
                if (projectile.missile) {
                    context.save();
                    context.translate(projectile.x, projectile.y);
                    context.rotate(projectile.angle);
                    context.globalCompositeOperation = "lighter";
                    const exhaust = context.createLinearGradient(-projectile.size * 1.8, 0, -projectile.size * 0.2, 0);
                    exhaust.addColorStop(0, "rgba(255,80,20,0)");
                    exhaust.addColorStop(0.45, "rgba(255,115,30,0.55)");
                    exhaust.addColorStop(0.8, "rgba(255,215,80,0.95)");
                    exhaust.addColorStop(1, "rgba(225,245,255,1)");
                    context.fillStyle = exhaust;
                    context.beginPath();
                    context.moveTo(-projectile.size * 1.8, 0);
                    context.lineTo(-projectile.size * 0.2, -projectile.size * 0.2);
                    context.lineTo(-projectile.size * 0.2, projectile.size * 0.2);
                    context.closePath();
                    context.fill();
                    context.globalCompositeOperation = "source-over";
                    const bodyLength = projectile.size * 1.25;
                    const bodyRadius = Math.max(3, projectile.size * 0.18);
                    context.fillStyle = "#8b949c";
                    context.beginPath();
                    context.moveTo(-bodyLength * 0.42, -bodyRadius);
                    context.lineTo(-bodyLength * 0.62, -bodyRadius * 1.75);
                    context.lineTo(-bodyLength * 0.2, -bodyRadius);
                    context.lineTo(-bodyLength * 0.2, bodyRadius);
                    context.lineTo(-bodyLength * 0.62, bodyRadius * 1.75);
                    context.lineTo(-bodyLength * 0.42, bodyRadius);
                    context.closePath();
                    context.fill();
                    const body = context.createLinearGradient(0, -bodyRadius, 0, bodyRadius);
                    body.addColorStop(0, "#f5f7f8");
                    body.addColorStop(0.5, "#aeb8bf");
                    body.addColorStop(1, "#59636b");
                    context.fillStyle = body;
                    context.strokeStyle = "#303940";
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(-bodyLength * 0.48, -bodyRadius);
                    context.lineTo(bodyLength * 0.28, -bodyRadius);
                    context.lineTo(bodyLength * 0.58, 0);
                    context.lineTo(bodyLength * 0.28, bodyRadius);
                    context.lineTo(-bodyLength * 0.48, bodyRadius);
                    context.closePath();
                    context.fill();
                    context.stroke();
                    context.fillStyle = "#d94a3d";
                    context.fillRect(bodyLength * 0.08, -bodyRadius, bodyLength * 0.12, bodyRadius * 2);
                    context.restore();
                    this.drawSprite(context, "missile2_4x.png", projectile.x, projectile.y, projectile.angle + Math.PI / 2, projectile.size * 1.1, 0.7, false);
                } else if (projectile.weapon === "ion") {
                    context.globalCompositeOperation = "lighter";
                    context.fillStyle = "rgba(55,170,255,0.35)";
                    context.beginPath();
                    context.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
                    context.fill();
                    this.drawSprite(context, "ball_laser_2x.png", projectile.x, projectile.y, projectile.angle, projectile.size, 1, true);
                } else {
                    context.globalCompositeOperation = "lighter";
                    const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
                    context.strokeStyle = projectile.color;
                    context.lineWidth = projectile.size > 12 ? 3 : 2;
                    context.beginPath();
                    context.moveTo(projectile.x, projectile.y);
                    context.lineTo(projectile.x - projectile.vx / speed * projectile.size * 1.8, projectile.y - projectile.vy / speed * projectile.size * 1.8);
                    context.stroke();
                    this.drawSprite(context, "laser_4x.png", projectile.x, projectile.y, projectile.angle + Math.PI / 2, projectile.size, 1, true);
                }
            }
            context.restore();
        }

        drawEffect(context, effect) {
            if (effect.age < 0) return;
            const progress = Math.min(1, effect.age / effect.life);
            context.save();
            if (effect.kind === "beam") {
                context.globalCompositeOperation = "lighter";
                context.globalAlpha = 1 - progress;
                context.strokeStyle = effect.color;
                context.lineWidth = effect.size;
                context.beginPath();
                context.moveTo(effect.x, effect.y);
                context.lineTo(effect.targetX, effect.targetY);
                context.stroke();
                context.restore();
                return;
            }
            context.globalCompositeOperation = effect.kind === "smoke" ? "source-over" : "lighter";
            context.globalAlpha = (1 - progress) * (effect.kind === "smoke" ? 0.3 : 0.85);
            const radius = effect.size * (0.35 + progress);
            const gradient = context.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
            if (effect.kind === "smoke") {
                gradient.addColorStop(0, "#89909a");
                gradient.addColorStop(1, "rgba(30,35,45,0)");
            } else {
                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(0.25, effect.color || "#ffd45b");
                gradient.addColorStop(0.6, "#ff542e");
                gradient.addColorStop(1, "rgba(180,0,0,0)");
            }
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        drawSpaceDust(context, world) {
            if (!world.background.spaceDust) return;
            context.save();
            context.fillStyle = "#d7e7ff";
            for (const dust of world.spaceDust) {
                context.globalAlpha = dust.alpha;
                context.fillRect(dust.x * world.width, dust.y * world.height, 1.5, 1.5);
            }
            context.restore();
        }

        drawDebug(context, world, settings) {
            if (!settings.showHitboxes && !settings.showHpBars && !settings.showShipMovement && !settings.showShipState && !settings.showProjectileTargets) return;
            context.save();
            context.font = "12px monospace";
            context.textAlign = "center";
            context.lineWidth = 1;
            if (settings.showProjectileTargets) {
                context.strokeStyle = "rgba(255,210,90,0.35)";
                for (const projectile of world.projectiles) {
                    const target = world.ships.find((ship) => ship.id === projectile.targetId);
                    if (!target) continue;
                    context.beginPath();
                    context.moveTo(projectile.x, projectile.y);
                    context.lineTo(target.x, target.y);
                    context.stroke();
                }
            }
            for (const ship of world.ships) {
                if (settings.showHitboxes) {
                    context.strokeStyle = "rgba(80,255,130,0.75)";
                    context.beginPath();
                    context.arc(ship.x, ship.y, ship.radius, 0, Math.PI * 2);
                    context.stroke();
                }
                if (settings.showShipMovement) {
                    context.strokeStyle = "rgba(90,190,255,0.75)";
                    context.beginPath();
                    context.moveTo(ship.x, ship.y);
                    context.lineTo(ship.x + Math.cos(ship.angle) * 65, ship.y + Math.sin(ship.angle) * 65);
                    context.stroke();
                }
                if (settings.showHpBars) {
                    const width = Math.max(24, ship.radius * 2);
                    context.fillStyle = "rgba(0,0,0,0.75)";
                    context.fillRect(ship.x - width / 2, ship.y - ship.radius - 11, width, 4);
                    context.fillStyle = "#70e47b";
                    context.fillRect(ship.x - width / 2, ship.y - ship.radius - 11, width * Math.max(0, ship.health / ship.maxHealth), 4);
                }
                if (settings.showShipState) {
                    context.fillStyle = "#ffffff";
                    context.fillText(ship.state === "active" ? ship.aiState : ship.state, ship.x, ship.y + ship.radius + 16);
                }
            }
            context.restore();
        }

        drawUi(context, world, settings, fps) {
            const pixelScale = Math.max(1, Math.min(this.scaleX, this.scaleY));
            context.save();
            context.textBaseline = "middle";
            if (settings.showScore && settings.simulationMode !== "freeforall") {
                const scores = world.stats.factions;
                const text = `Earth: ${scores.earth.score}  Gliese: ${scores.gliese.score}  Eridani: ${scores.eridani.score}`;
                const fontSize = Math.round(15 * pixelScale * Math.max(0.5, Math.min(2.5, settings.scoreSize / 100)));
                const horizontal = this.canvas.width / 2 + settings.scoreHorizontalOffset * pixelScale;
                const edge = 16 * pixelScale + settings.scoreVerticalOffset * pixelScale;
                const vertical = settings.scoreOrientation === "top" ? edge : this.canvas.height - edge;
                const opacity = Math.max(0.1, Math.min(1, settings.scoreOpacity / 100));
                const color = this.wallpaperColor(settings.scoreColor, opacity);
                context.font = `${fontSize}px monospace`;
                context.textAlign = "center";
                if (settings.scoreBackground) {
                    const metrics = context.measureText(text);
                    const paddingX = 10 * pixelScale;
                    const paddingY = 6 * pixelScale;
                    const backgroundOpacity = Math.max(0.1, Math.min(1, settings.scoreBackgroundOpacity / 100));
                    context.fillStyle = `rgba(0, 0, 0, ${backgroundOpacity})`;
                    context.fillRect(horizontal - metrics.width / 2 - paddingX, vertical - fontSize / 2 - paddingY, metrics.width + paddingX * 2, fontSize + paddingY * 2);
                }
                context.fillStyle = color;
                context.fillText(text, horizontal, vertical);
            }
            if (settings.showFps) {
                context.fillStyle = "#ffffff";
                context.font = `${Math.round(15 * pixelScale)}px monospace`;
                context.textAlign = "right";
                context.fillText(`${Math.round(fps)} FPS`, this.canvas.width - 8 * pixelScale, 14 * pixelScale);
            }
            context.restore();
        }

        wallpaperColor(value, alpha) {
            const components = String(value || "1 1 1").trim().split(/\s+/).map(Number);
            const red = Math.round(Math.max(0, Math.min(1, components[0] ?? 1)) * 255);
            const green = Math.round(Math.max(0, Math.min(1, components[1] ?? 1)) * 255);
            const blue = Math.round(Math.max(0, Math.min(1, components[2] ?? 1)) * 255);
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        }

        drawSprite(context, name, x, y, angle, targetSize, alpha, additive) {
            const image = this.images.get(name);
            if (!image) return;
            this.drawImage(context, image, x, y, angle, targetSize, alpha, additive);
        }

        drawImage(context, image, x, y, angle, targetSize, alpha, additive) {
            let width = image.width;
            let height = image.height;
            if (targetSize) {
                const scale = targetSize / Math.max(width, height);
                width *= scale;
                height *= scale;
            }
            context.save();
            if (additive) context.globalCompositeOperation = "lighter";
            context.globalAlpha = alpha === undefined ? 1 : alpha;
            context.translate(x, y);
            context.rotate(angle || 0);
            context.drawImage(image, -width / 2, -height / 2, width, height);
            context.restore();
        }
    }

    window.CanvasRenderer = CanvasRenderer;
}());