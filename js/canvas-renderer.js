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
        "shield_cruiser_class_4x.png", "shield_fighter_class.png", "shield_bomber_class.png", "missile2_4x.png"
    ];

    class CanvasRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
            this.images = new Map();
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

        draw(world, brightness) {
            const context = this.context;
            const scaleX = this.canvas.width / world.width;
            const scaleY = this.canvas.height / world.height;
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.globalAlpha = 1;
            context.globalCompositeOperation = "source-over";
            context.fillStyle = "#000006";
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            const background = this.images.get("static_bg.png");
            if (background) context.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);
            context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            for (const decoration of world.decorations) this.drawDecoration(context, decoration, world);
            for (const asteroid of world.asteroids) this.drawSprite(context, asteroid.sprite, asteroid.x * world.width, asteroid.y * world.height, asteroid.angle, asteroid.size, 0.55);
            for (const effect of world.effects.filter((item) => item.kind === "debris")) this.drawSprite(context, effect.sprite, effect.x, effect.y, effect.angle, effect.size, Math.max(0, 1 - effect.age / effect.life));
            for (const ship of world.ships) this.drawShip(context, ship);
            this.drawProjectiles(context, world.projectiles);
            for (const effect of world.effects.filter((item) => item.kind !== "debris")) this.drawEffect(context, effect);
            context.setTransform(1, 0, 0, 1, 0, 0);
            if (brightness !== 100) {
                if (brightness < 100) {
                    context.fillStyle = `rgba(0,0,0,${1 - brightness / 100})`;
                    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                } else {
                    context.globalCompositeOperation = "screen";
                    context.fillStyle = `rgba(255,255,255,${Math.min(0.35, (brightness - 100) / 250)})`;
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

        drawShip(context, ship) {
            const pulse = 0.72 + Math.sin(ship.enginePulse) * 0.2;
            if (ship.state === "active") this.drawSprite(context, ship.engine, ship.x, ship.y, ship.angle + Math.PI / 2, null, pulse);
            const alpha = ship.state === "exploding" ? Math.max(0, 1 - ship.deathTimer / 0.9) : 1;
            this.drawSprite(context, ship.sprite, ship.x, ship.y, ship.angle + Math.PI / 2, null, alpha);
            if (ship.shield < ship.maxShield && ship.shield > 0) {
                const shieldName = ship.type === "capital" ? "shield_cruiser_class_4x.png" : ship.type === "bomber" ? "shield_bomber_class.png" : "shield_fighter_class.png";
                this.drawSprite(context, shieldName, ship.x, ship.y, ship.angle + Math.PI / 2, ship.radius * 2.8, 0.12 + 0.2 * (ship.shield / ship.maxShield), true);
            }
        }

        drawProjectiles(context, projectiles) {
            context.save();
            context.globalCompositeOperation = "lighter";
            for (const projectile of projectiles) {
                if (projectile.missile) {
                    this.drawSprite(context, "missile2_4x.png", projectile.x, projectile.y, projectile.angle + Math.PI / 2, 12, 1);
                } else {
                    context.strokeStyle = projectile.color;
                    context.lineWidth = 2;
                    context.beginPath();
                    context.moveTo(projectile.x, projectile.y);
                    context.lineTo(projectile.x - Math.cos(projectile.angle) * 13, projectile.y - Math.sin(projectile.angle) * 13);
                    context.stroke();
                }
            }
            context.restore();
        }

        drawEffect(context, effect) {
            if (effect.age < 0) return;
            const progress = Math.min(1, effect.age / effect.life);
            context.save();
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

        drawSprite(context, name, x, y, angle, targetSize, alpha, additive) {
            const image = this.images.get(name);
            if (!image) return;
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