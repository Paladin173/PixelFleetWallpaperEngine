const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

async function openWallpaper(page, width = 1280, height = 720) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForFunction(() => window.pixelFleetApp && window.pixelFleetApp.frameCount > 1);
}

test("Wallpaper Engine manifest and original assets are complete", async () => {
    const project = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "project.json"), "utf8"));
    expect(project.type).toBe("web");
    expect(project.file).toBe("index.html");
    expect(project.general.properties.simulationmode.value).toBe("survival");
    expect(project.general.properties.capitalships.value).toBe(6);
    expect(project.general.properties.fighters.value).toBe(12);
    expect(project.general.properties.bombers.value).toBe(6);
    expect(Object.keys(project.general.properties)).toHaveLength(53);
    const orderedSettings = [
        "display_settings",
        "renderquality", "zoom", "brightness",
        "battle_settings",
        "simulationmode", "capitalships", "fighters", "bombers",
        "environment_settings",
        "asteroids", "stars", "spacedust", "planets", "asteroidbelt",
        "effects_settings",
        "debris", "slowmotion", "autobalance", "interaction",
        "scoreboard_settings",
        "showscore", "scoreorientation", "scorehorizontaloffset", "scoreverticaloffset", "scoresize",
        "scoreopacity", "scorecolor", "scorebackground", "scorebackgroundopacity", "resetstats",
        "earth_settings",
        "spawnearthcruiser", "spawnearthmissilefrigate", "spawnearthfighter", "spawnearthbomber",
        "gliese_settings",
        "spawngliesecorvette", "spawngliesedreadnaught", "spawngliesefighter", "spawngliesebomber",
        "eridani_settings",
        "spawneridanigunboat", "spawneridanidestroyer", "spawneridanifighter", "spawneridanibomber",
        "diagnostics_settings",
        "showhitboxes", "showhpbars", "showshipmovement", "showshipstate", "showprojectiletargets", "showfps"
    ];
    expect(Object.keys(project.general.properties).sort()).toEqual([...orderedSettings].sort());
    expect(project.general.properties.scorehorizontaloffset).toMatchObject({ type: "slider", min: -1000, max: 1000, value: 0 });
    expect(project.general.properties.scoreverticaloffset).toMatchObject({ type: "slider", min: 0, max: 1000, value: 0 });
    const sections = {
        display_settings: "Display",
        battle_settings: "Battle",
        environment_settings: "Environment",
        effects_settings: "Effects &amp; Interaction",
        scoreboard_settings: "Scoreboard",
        earth_settings: "Earth Fleet",
        gliese_settings: "Gliese Fleet",
        eridani_settings: "Eridani Fleet",
        diagnostics_settings: "Diagnostics"
    };
    for (const [key, label] of Object.entries(sections)) {
        expect(project.general.properties[key]).toMatchObject({ type: "bool", text: `<hr><h3>${label}</h3><hr>` });
    }
    expect(project.general.properties.display_settings.value).toBe(true);
    expect(project.general.properties.zoom).toMatchObject({ index: 2, order: 102, condition: "display_settings.value", text: "Camera Zoom Out", type: "slider", min: 1, max: 5, step: 0.1, value: 1 });
    expect(project.general.properties.stars.options).toContainEqual({ label: "Never", value: "never" });
    expect(project.general.properties.stars).toMatchObject({ index: 11, order: 111, condition: "environment_settings.value", text: "Stars" });
    expect(project.general.properties.planets).toMatchObject({ index: 13, order: 113, condition: "environment_settings.value", text: "Planets" });
    expect(project.general.properties.spawnearthcruiser).toMatchObject({ index: 32, order: 132, condition: "earth_settings.value", text: "Cruiser" });
    expect(project.general.properties.spawngliesecorvette).toMatchObject({ index: 37, order: 137, condition: "gliese_settings.value", text: "Corvette" });
    expect(project.general.properties.spawneridanigunboat).toMatchObject({ index: 42, order: 142, condition: "eridani_settings.value", text: "Gunboat" });
    const properties = Object.values(project.general.properties);
    expect(properties.map((property) => property.index).sort((left, right) => left - right)).toEqual([...Array(53).keys()]);
    expect(properties.map((property) => property.order).sort((left, right) => left - right)).toEqual([...Array(53).keys()].map((index) => index + 100));
    expect(project.general.properties.scorebackgroundopacity.condition).toBe("scoreboard_settings.value && scorebackground.value");
    for (const filename of ["static_bg.png", "cruiser_1_4x.png", "gliese_dreadnaught_4x.png", "epsilon_eridani_gunboat.png"]) {
        expect(fs.statSync(path.join(__dirname, "..", "assets", filename)).size).toBeGreaterThan(0);
    }
});

test("default scene renders the original starfield and all fleet classes", async ({ page }) => {
    await openWallpaper(page);
    const state = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const pixels = app.renderer.context.getImageData(0, 0, app.renderer.canvas.width, app.renderer.canvas.height).data;
        let litPixels = 0;
        for (let index = 0; index < pixels.length; index += 64) {
            if (pixels[index] || pixels[index + 1] || pixels[index + 2]) litPixels += 1;
        }
        const sprite = app.world.ships.find((ship) => ship.type === "capital").sprite;
        const tintTotals = {};
        for (const faction of ["earth", "gliese", "eridani"]) {
            const tinted = app.renderer.tintedSprite(sprite, faction);
            const data = tinted.getContext("2d").getImageData(0, 0, tinted.width, tinted.height).data;
            const totals = [0, 0, 0];
            for (let index = 0; index < data.length; index += 4) {
                if (!data[index + 3]) continue;
                totals[0] += data[index];
                totals[1] += data[index + 1];
                totals[2] += data[index + 2];
            }
            tintTotals[faction] = totals;
        }
        const cacheReused = app.renderer.tintedSprite(sprite, "gliese") === app.renderer.tintedSprite(sprite, "gliese");
        const exhaustContext = {
            fillStyles: [], points: [], fillStyle: "", globalAlpha: 1, globalCompositeOperation: "source-over",
            save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, closePath() {},
            moveTo(x, y) { this.points.push([x, y]); }, lineTo(x, y) { this.points.push([x, y]); },
            fill() { this.fillStyles.push(this.fillStyle); }
        };
        for (const faction of ["earth", "gliese", "eridani"]) {
            app.renderer.drawEngineExhaust(exhaustContext, {
                faction, radius: 20, type: "capital", state: "active", speed: 100, maxSpeed: 100
            }, 40, 40, 0.8);
        }
        const lowPulseContext = { ...exhaustContext, fillStyles: [], points: [] };
        const highPulseContext = { ...exhaustContext, fillStyles: [], points: [] };
        const engineShip = { faction: "gliese", radius: 20, type: "fighter", state: "active", speed: 100, maxSpeed: 100 };
        app.renderer.drawEngineExhaust(lowPulseContext, engineShip, 0, 0, 0.55);
        app.renderer.drawEngineExhaust(highPulseContext, engineShip, 0, 0, 0.95);
        const ship = app.world.ships[0];
        let tintedDraws = 0;
        let exhaustDraws = 0;
        const originalTintedDraw = app.renderer.drawTintedSprite.bind(app.renderer);
        const originalExhaustDraw = app.renderer.drawEngineExhaust.bind(app.renderer);
        app.renderer.drawTintedSprite = (...args) => { tintedDraws += 1; originalTintedDraw(...args); };
        app.renderer.drawEngineExhaust = (...args) => { exhaustDraws += 1; originalExhaustDraw(...args); };
        app.renderer.drawShipAt(app.renderer.context, ship, ship.x, ship.y);
        app.renderer.drawTintedSprite = originalTintedDraw;
        app.renderer.drawEngineExhaust = originalExhaustDraw;
        return {
            litPixels,
            shipCount: app.world.ships.length,
            types: [...new Set(app.world.ships.map((ship) => ship.type))],
            factions: [...new Set(app.world.ships.map((ship) => ship.faction))],
            loadedAssets: app.renderer.images.size,
            hasMarkerOverlay: typeof app.renderer.drawFactionMarkings === "function",
            tintTotals,
            cacheReused,
            exhaustColors: [...new Set(exhaustContext.fillStyles)],
            lowPulseTail: Math.min(...lowPulseContext.points.map(([x]) => x)),
            highPulseTail: Math.min(...highPulseContext.points.map(([x]) => x)),
            tintedDraws,
            exhaustDraws
        };
    });
    expect(state.litPixels).toBeGreaterThan(1000);
    expect(state.shipCount).toBe(24);
    expect(state.types.sort()).toEqual(["bomber", "capital", "fighter"]);
    expect(state.factions.sort()).toEqual(["earth", "eridani", "gliese"]);
    expect(state.loadedAssets).toBe(44);
    expect(state.hasMarkerOverlay).toBe(false);
    expect(state.cacheReused).toBe(true);
    expect(state.tintTotals.gliese[0]).toBeGreaterThan(state.tintTotals.eridani[0]);
    expect(state.tintTotals.eridani[2]).toBeGreaterThan(state.tintTotals.gliese[2]);
    expect(state.exhaustColors).toEqual(["#4bbcff", "#e8fbff", "#ff3d24", "#ffd06a", "#ffb000", "#fff2a6"]);
    expect(state.highPulseTail).toBeLessThan(state.lowPulseTail);
    expect(state.tintedDraws).toBe(1);
    expect(state.exhaustDraws).toBe(1);
});

test("factions start equidistant with balanced durability and varied battle seeds", async ({ page }) => {
    await openWallpaper(page);
    const state = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const factions = ["earth", "gliese", "eridani"];
        const centers = Object.fromEntries(factions.map((faction) => {
            const ships = world.ships.filter((ship) => ship.faction === faction);
            return [faction, {
                x: ships.reduce((total, ship) => total + ship.x, 0) / ships.length,
                y: ships.reduce((total, ship) => total + ship.y, 0) / ships.length
            }];
        }));
        const distances = [["earth", "gliese"], ["gliese", "eridani"], ["eridani", "earth"]].map(([left, right]) =>
            Math.hypot(centers[left].x - centers[right].x, centers[left].y - centers[right].y));
        const earthHealth = Object.fromEntries(["capital", "fighter", "bomber"].map((type) => [
            type,
            [...new Set(world.ships.filter((ship) => ship.faction === "earth" && ship.type === type).map((ship) => ship.maxHealth))]
        ]));
        const firstLayout = world.ships.map((ship) => [ship.sprite, ship.x, ship.y]);
        const formationSpans = factions.map((faction) => {
            const ships = world.ships.filter((ship) => ship.faction === faction);
            return Math.max(...ships.flatMap((left) => ships.map((right) => Math.hypot(left.x - right.x, left.y - right.y))));
        });
        world.restart();
        const secondLayout = world.ships.map((ship) => [ship.sprite, ship.x, ship.y]);
        return { distances, earthHealth, formationSpans, firstLayout, secondLayout };
    });
    expect(Math.max(...state.distances) / Math.min(...state.distances)).toBeLessThan(1.25);
    expect(Math.min(...state.formationSpans)).toBeGreaterThan(200);
    expect(state.earthHealth).toEqual({ capital: [700], fighter: [55], bomber: [100] });
    expect(state.secondLayout).not.toEqual(state.firstLayout);
});

test("auto-balance uses the original APK score-weighted spawn probabilities", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        world.settings.autoBalance = true;
        world.stats.factions.earth.score = 11;
        world.stats.factions.gliese.score = 17;
        world.stats.factions.eridani.score = 16;
        const weights = world.factionSpawnWeights();
        world.stats.factions.earth.score = 3;
        world.stats.factions.gliese.score = 3;
        world.stats.factions.eridani.score = 3;
        const beforeThreshold = [0, 1, 2].map((index) => world.chooseFaction("fighter", index));
        world.stats.factions.earth.score = 11;
        world.stats.factions.gliese.score = 17;
        world.stats.factions.eridani.score = 17;
        const tiedWeights = world.factionSpawnWeights();
        const continuousSelection = [0, 1, 2].map((index) => world.chooseFaction("fighter", index, false));
        return { weights, beforeThreshold, tiedWeights, continuousSelection };
    });
    expect(result.weights).toEqual({ earth: 49, gliese: 22, eridani: 29 });
    expect(result.beforeThreshold).toEqual(["earth", "gliese", "eridani"]);
    expect(result.tiedWeights).toEqual({ earth: 52, gliese: 28, eridani: 21 });
    expect(result.continuousSelection).toEqual(["earth", "gliese", "eridani"]);
});

test("ships and projectiles cross edges seamlessly and warp without the boxed bitmap", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const world = app.world;
        const renderer = app.renderer;
        const ship = world.ships[0];
        const target = world.ships.find((candidate) => candidate.faction !== ship.faction);
        ship.x = world.width - 5;
        ship.y = world.height / 2;
        target.x = 5;
        target.y = world.height / 2;
        const decoy = { ...target, id: -1, x: world.width - 200 };
        world.ships = [ship, target, decoy];
        const selectedAcrossEdge = world.findTarget(ship).id === target.id;
        const shortestOffset = world.wrappedOffset(ship.x, target.x, world.width);
        ship.sprite = "gliese_corvette.png";
        ship.faction = "gliese";
        ship.weaponBatteries = null;
        world.fire(ship, target);
        const beamTargetX = world.effects.find((effect) => effect.kind === "beam").targetX;

        world.projectiles = [{
            x: world.width - 1, y: 20, vx: 120, vy: 0, angle: 0, targetId: 0,
            faction: ship.faction, damage: 1, life: 2, missile: false, weapon: "laser", color: "#fff"
        }];
        world.updateProjectiles(1 / 30);
        const projectileX = world.projectiles[0].x;

        ship.state = "active";
        ship.x = world.width - 1;
        ship.y = world.height / 2;
        ship.angle = 0;
        ship.speed = ship.maxSpeed;
        ship.targetId = target.id;
        ship.retargetTimer = 10;
        ship.systems.weapons = 0;
        world.updateShip(ship, 0.1);
        const wrappedShipX = ship.x;

        ship.state = "active";
        ship.health = ship.maxHealth;
        ship.shield = 0;
        ship.x = world.width - 4;
        ship.y = 30;
        world.asteroids = [{ x: 2 / world.width, y: 30 / world.height, size: 8, angle: 0, spin: 0, speedX: 0, speedY: 0, hitTimer: 0 }];
        world.updateBackground(1 / 60);
        const asteroidHitAcrossEdge = ship.health < ship.maxHealth;
        const destroyedAcrossEdge = world.destroyAt(3, 30, 20);

        const positions = [];
        const spriteNames = [];
        let warpFlares = 0;
        renderer.drawWarp(renderer.context, world.width / 2, world.height / 2, 0, ship.radius, 1);
        const originalDrawShipAt = renderer.drawShipAt;
        const originalDrawSprite = renderer.drawSprite;
        const originalDrawWarp = renderer.drawWarp;
        renderer.drawShipAt = (_context, _ship, x, y) => positions.push([x, y]);
        ship.state = "active";
        ship.x = 1;
        renderer.drawShip(renderer.context, ship, world);
        target.state = "active";
        renderer.drawShip(renderer.context, target, world);
        renderer.drawShipAt = originalDrawShipAt;
        renderer.drawSprite = (_context, name) => spriteNames.push(name);
        renderer.drawWarp = () => { warpFlares += 1; };
        ship.state = "warping";
        ship.x = world.width * 0.8;
        ship.y = world.height * 0.2;
        ship.angle = 0;
        world.updateShip(ship, 0.1);
        const warpAngle = ship.angle;
        const expectedWarpAngle = Math.atan2(ship.y - world.height / 2, ship.x - world.width / 2);
        renderer.drawShip(renderer.context, ship, world);
        renderer.drawSprite = originalDrawSprite;
        renderer.drawWarp = originalDrawWarp;
        return { selectedAcrossEdge, shortestOffset, beamTargetX, targetX: target.x, worldWidth: world.width, projectileX, wrappedShipX, asteroidHitAcrossEdge, destroyedAcrossEdge, positions, spriteNames, warpFlares, warpAngle, expectedWarpAngle };
    });
    expect(result.selectedAcrossEdge).toBe(true);
    expect(result.shortestOffset).toBe(10);
    expect(result.beamTargetX).toBe(result.worldWidth + result.targetX);
    expect(result.projectileX).toBe(3);
    expect(result.wrappedShipX).toBeLessThan(20);
    expect(result.asteroidHitAcrossEdge).toBe(true);
    expect(result.destroyedAcrossEdge).toBe(true);
    expect(result.positions.some(([x]) => x > 1)).toBe(true);
    expect(result.positions.some(([x]) => x === result.beamTargetX)).toBe(true);
    expect(result.spriteNames).not.toContain("warp.png");
    expect(result.warpFlares).toBe(1);
    expect(result.warpAngle).toBeCloseTo(result.expectedWarpAngle, 10);
});

test("fleet simulation moves, targets, and fires", async ({ page }) => {
    await openWallpaper(page);
    const initial = await page.evaluate(() => ({
        ships: Object.fromEntries(window.pixelFleetApp.world.ships.map((ship) => [ship.id, { x: ship.x, y: ship.y }])),
        time: window.pixelFleetApp.world.time
    }));
    await page.waitForFunction((initialTime) => {
        const world = window.pixelFleetApp.world;
        return world.time > initialTime + 1 && world.projectiles.length + world.effects.length > 0;
    }, initial.time, { timeout: 6000 });
    const result = await page.evaluate((positions) => ({
        stationaryClasses: [...new Set(window.pixelFleetApp.world.ships
            .filter((ship) => ship.state === "active" && positions[ship.id] && Math.hypot(ship.x - positions[ship.id].x, ship.y - positions[ship.id].y) <= 1)
            .map((ship) => `${ship.faction}:${ship.sprite}`))],
        time: window.pixelFleetApp.world.time,
        targets: window.pixelFleetApp.world.ships.filter((ship) => ship.targetId).length,
        activeOrHit: window.pixelFleetApp.world.projectiles.length + window.pixelFleetApp.world.effects.length
    }), initial.ships);
    expect(result.stationaryClasses).toEqual([]);
    expect(result.time).toBeGreaterThan(initial.time + 1);
    expect(result.targets).toBeGreaterThan(10);
    expect(result.activeOrHit).toBeGreaterThan(0);
});

test("capital ships without hull preference acquire targets and move", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const ship = world.ships.find((candidate) => candidate.type === "capital" && !candidate.ai.preferHullDamage);
        const target = world.ships.find((candidate) => candidate.faction !== ship.faction && candidate.state === "active");
        Object.assign(ship, { x: 200, y: 200, targetId: 0, retargetTimer: 0, speed: 0 });
        Object.assign(target, { x: 700, y: 200, state: "active" });
        world.ships = [ship, target];
        const before = { x: ship.x, y: ship.y };
        for (let index = 0; index < 120; index += 1) world.updateShip(ship, 1 / 60);
        return { targetId: ship.targetId, expectedTargetId: target.id, distance: Math.hypot(ship.x - before.x, ship.y - before.y) };
    });
    expect(result.targetId).toBe(result.expectedTargetId);
    expect(result.distance).toBeGreaterThan(1);
});

test("fleet roles preserve artillery standoff, fighter escort, and allied spacing", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const artillery = world.ships.find((ship) => ship.sprite === "earth_missile_cruiser_4x.png");
        const artilleryTarget = world.ships.find((ship) => ship.faction === "gliese" && ship.type === "capital");
        Object.assign(artillery, { x: 500, y: 200, angle: 0, speed: 0, targetId: artilleryTarget.id, retargetTimer: 10, aiState: "engaging" });
        Object.assign(artilleryTarget, { x: 350, y: 200, state: "active" });
        artillery.weaponTimers.fill(0);
        world.ships = [artillery, artilleryTarget];
        world.projectiles = [];
        world.updateShip(artillery, 0.1);
        const artilleryResult = {
            role: artillery.role,
            movedAway: artillery.x > 500,
            firedBackward: world.projectiles.length > 0 && world.projectiles.every((projectile) => projectile.vx < 0)
        };

        world.restart();
        const anchor = world.ships.find((ship) => ship.role === "carrier");
        const fighter = world.ships.find((ship) => ship.faction === "earth" && ship.type === "fighter");
        const threat = world.ships.find((ship) => ship.faction === "gliese" && ship.type === "capital");
        const decoy = world.ships.find((ship) => ship.faction === "eridani" && ship.type === "capital");
        const launchStart = { x: fighter.x, y: fighter.y, angle: fighter.angle };
        const launchState = {
            carrierRole: anchor.role,
            fighterState: fighter.state,
            carrierId: fighter.carrierId,
            expectedCarrierId: anchor.id,
            startsAtCarrier: Math.hypot(fighter.x - anchor.x, fighter.y - anchor.y) < anchor.radius,
            queuedFighters: world.ships.filter((ship) => ship.carrierId === anchor.id && ship.launchDelay > 0).length
        };
        const queuedFighter = world.ships.find((ship) => ship.carrierId === anchor.id && ship.launchDelay > 0);
        const queuedStart = { x: queuedFighter.x, y: queuedFighter.y };
        anchor.state = "exploding";
        world.updateShip(queuedFighter, 0.1);
        const carrierLossLaunch = {
            delay: queuedFighter.launchDelay,
            moved: Math.hypot(queuedFighter.x - queuedStart.x, queuedFighter.y - queuedStart.y) > 0
        };
        anchor.state = "active";
        world.updateShip(fighter, fighter.launchTimer + 0.1);
        const launchResult = {
            state: fighter.state,
            movedForward: (fighter.x - launchStart.x) * Math.cos(launchStart.angle)
                + (fighter.y - launchStart.y) * Math.sin(launchStart.angle) > 0,
            escortAnchorId: world.findEscortAnchor(fighter)?.id
        };
        const renderer = window.pixelFleetApp.renderer;
        let renderedHulls = 0;
        let renderedExhaust = 0;
        const originalTintedDraw = renderer.drawTintedSprite.bind(renderer);
        const originalExhaustDraw = renderer.drawEngineExhaust.bind(renderer);
        renderer.drawTintedSprite = () => { renderedHulls += 1; };
        renderer.drawEngineExhaust = () => { renderedExhaust += 1; };
        queuedFighter.launchDelay = 1;
        renderer.drawShip(renderer.context, queuedFighter, world);
        const hiddenWhileQueued = renderedHulls === 0 && renderedExhaust === 0;
        queuedFighter.launchDelay = 0;
        renderer.drawShip(renderer.context, queuedFighter, world);
        renderer.drawTintedSprite = originalTintedDraw;
        renderer.drawEngineExhaust = originalExhaustDraw;
        const renderedWhenReleased = renderedHulls === 1 && renderedExhaust === 1;
        Object.assign(anchor, { x: 500, y: 450, state: "active" });
        Object.assign(fighter, { x: 150, y: 450, angle: 0, speed: 0, targetId: 0, retargetTimer: 0, aiState: "engaging", state: "active" });
        Object.assign(threat, { x: 600, y: 450, state: "active", shield: threat.maxShield });
        Object.assign(decoy, { x: 140, y: 450, state: "active", shield: decoy.maxShield });
        world.ships = [anchor, fighter, threat, decoy];
        const escortDistanceBefore = Math.abs(world.wrappedOffset(fighter.x, anchor.x, world.width));
        world.updateShip(fighter, 0.5);
        const escortResult = {
            role: fighter.role,
            targetId: fighter.targetId,
            expectedTargetId: threat.id,
            returnedToAnchor: Math.abs(world.wrappedOffset(fighter.x, anchor.x, world.width)) < escortDistanceBefore
        };

        Object.assign(decoy, {
            x: 100, y: 300, angle: 0, speed: 0, role: "line", targetId: threat.id,
            retargetTimer: 10, aiState: "engaging", ai: { ...decoy.ai, keepDistance: true, straightAttackPath: false }
        });
        Object.assign(threat, { x: 700, y: 300, state: "active" });
        world.ships = [decoy, threat];
        world.updateShip(decoy, 0.5);
        const longRangePursuit = decoy.speed > 0;

        const wingLeft = anchor;
        const wingRight = { ...threat, id: 9001, faction: "earth", x: 550, y: 450, angle: 0, speed: 0, maxSpeed: 50, turnRate: 100, role: "line", targetId: decoy.id, retargetTimer: 10, aiState: "engaging" };
        Object.assign(wingLeft, { x: 500, y: 450, angle: 0, speed: 0, maxSpeed: 50, turnRate: 100, role: "line", targetId: decoy.id, retargetTimer: 10, aiState: "engaging" });
        Object.assign(decoy, { x: 1000, y: 450 });
        world.ships = [wingLeft, wingRight, decoy];
        const spacingBefore = Math.abs(wingRight.x - wingLeft.x);
        world.updateShip(wingLeft, 0.1);
        world.updateShip(wingRight, 0.1);
        const spacingAfter = Math.abs(wingRight.x - wingLeft.x);
        return { artilleryResult, launchState, carrierLossLaunch, launchResult, hiddenWhileQueued, renderedWhenReleased, escortResult, longRangePursuit, spacingBefore, spacingAfter };
    });
    expect(result.artilleryResult).toEqual({ role: "artillery", movedAway: true, firedBackward: true });
    expect(result.launchState).toEqual({
        carrierRole: "carrier",
        fighterState: "launching",
        carrierId: result.launchState.expectedCarrierId,
        expectedCarrierId: result.launchState.expectedCarrierId,
        startsAtCarrier: true,
        queuedFighters: 3
    });
    expect(result.carrierLossLaunch).toEqual({ delay: 0, moved: true });
    expect(result.launchResult).toEqual({ state: "active", movedForward: true, escortAnchorId: result.launchState.expectedCarrierId });
    expect(result.hiddenWhileQueued).toBe(true);
    expect(result.renderedWhenReleased).toBe(true);
    expect(result.escortResult).toEqual({ role: "escort", targetId: result.escortResult.expectedTargetId, expectedTargetId: result.escortResult.expectedTargetId, returnedToAnchor: true });
    expect(result.longRangePursuit).toBe(true);
    expect(result.spacingAfter).toBeGreaterThan(result.spacingBefore);
});

test("properties restart counts and no-ships mode", async ({ page }) => {
    await openWallpaper(page);
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({
        capitalships: { value: 3 }, fighters: { value: 6 }, bombers: { value: 3 }, asteroids: { value: 10 },
        asteroidbelt: { value: "never" }
    }));
    expect(await page.evaluate(() => window.pixelFleetApp.world.ships.length)).toBe(12);
    expect(await page.evaluate(() => window.pixelFleetApp.world.asteroids.length)).toBe(10);
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ simulationmode: { value: "noships" } }));
    expect(await page.evaluate(() => window.pixelFleetApp.world.ships.length)).toBe(0);
});

test("persisted Wallpaper Engine settings apply through stable property keys", async ({ page }) => {
    await openWallpaper(page);
    const state = await page.evaluate(() => {
        window.wallpaperPropertyListener.applyUserProperties({
            autobalance: { value: false }, bombers: { value: 10 }, capitalships: { value: 5 }, fighters: { value: 20 },
            scoreorientation: { value: "top" }, showhpbars: { value: true }, showscore: { value: true },
            simulationmode: { value: "galacticwar" }, slowmotion: { value: false }, stars: { value: "never" }
        });
        const app = window.pixelFleetApp;
        return {
            settings: app.settings,
            shipCount: app.world.ships.length,
            stars: app.world.background.stars
        };
    });
    expect(state.shipCount).toBe(35);
    expect(state.stars).toBe(false);
    expect(state.settings).toMatchObject({
        autoBalance: false, bombers: 10, capitalShips: 5, fighters: 20, scoreOrientation: "top",
        showHpBars: true, showScore: true, simulationMode: "galacticwar", slowMotion: false, stars: "never"
    });
});

test("all original settings map and constrain fleet and background generation", async ({ page }) => {
    await openWallpaper(page);
    const state = await page.evaluate(() => {
        window.wallpaperPropertyListener.applyUserProperties({
            stars: { value: "never" }, spacedust: { value: "never" }, planets: { value: "never" }, asteroidbelt: { value: "never" },
            spawnearthmissilefrigate: { value: false }, spawnearthfighter: { value: false }, spawnearthbomber: { value: false },
            spawngliesecorvette: { value: false }, spawngliesedreadnaught: { value: false }, spawngliesefighter: { value: false },
            spawngliesebomber: { value: false }, spawneridanigunboat: { value: false }, spawneridanidestroyer: { value: false },
            spawneridanifighter: { value: false }, spawneridanibomber: { value: false },
            showhitboxes: { value: true }, showhpbars: { value: true }, showshipmovement: { value: true },
            showshipstate: { value: true }, showprojectiletargets: { value: true }, showfps: { value: true }
        });
        const app = window.pixelFleetApp;
        app.renderer.draw(app.world, app.settings, 60);
        return {
            settings: app.settings,
            sprites: app.world.ships.map((ship) => ship.sprite),
            background: app.world.background,
            dust: app.world.spaceDust.length,
            decorations: app.world.decorations.length
        };
    });
    expect(state.sprites).toHaveLength(6);
    expect(new Set(state.sprites)).toEqual(new Set(["cruiser_1_4x.png"]));
    expect(state.background).toEqual({ stars: false, spaceDust: false, planets: false, asteroidBelt: false });
    expect(state.dust).toBe(0);
    expect(state.decorations).toBe(0);
    expect(state.settings.showFps).toBe(true);
    expect(state.settings.showProjectileTargets).toBe(true);
});

test("expanding settings sections does not restart the battle", async ({ page }) => {
    await openWallpaper(page);
    const before = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        return { battleNumber: world.battleNumber, shipIds: world.ships.map((ship) => ship.id), time: world.time };
    });
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({
        environment_settings: { value: true }
    }));
    const after = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        return { battleNumber: world.battleNumber, shipIds: world.ships.map((ship) => ship.id), time: world.time };
    });
    expect(after.battleNumber).toBe(before.battleNumber);
    expect(after.shipIds).toEqual(before.shipIds);
    expect(after.time).toBeGreaterThanOrEqual(before.time);
});

test("score placement, winner scoring, warp restart, persistence, and reset match the original lifecycle", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("pixelFleetStatsV1"));
    await openWallpaper(page);
    const scoreUi = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const calls = [];
        const originalFillText = app.renderer.context.fillText.bind(app.renderer.context);
        app.renderer.context.fillText = (...arguments_) => {
            calls.push(arguments_);
            originalFillText(...arguments_);
        };
        window.wallpaperPropertyListener.applyUserProperties({
            showscore: { value: true }, scoreorientation: { value: "top" },
            scorehorizontaloffset: { value: 40 }, scoreverticaloffset: { value: 30 }
        });
        app.renderer.draw(app.world, app.settings, 60);
        const scoreCall = calls.find(([text]) => text.startsWith("Earth:"));
        const pixelScale = Math.max(1, Math.min(app.renderer.scaleX, app.renderer.scaleY));
        return { scoreCall, expectedX: app.renderer.canvas.width / 2 + 40 * pixelScale, expectedY: 46 * pixelScale };
    });
    expect(scoreUi.scoreCall[1]).toBeCloseTo(scoreUi.expectedX, 5);
    expect(scoreUi.scoreCall[2]).toBeCloseTo(scoreUi.expectedY, 5);

    const battle = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const startingBattle = world.battleNumber;
        for (const ship of world.ships) if (ship.faction !== "earth") ship.state = "dead";
        world.update(1 / 60);
        const scored = { score: world.stats.factions.earth.score, state: world.battleState };
        for (let index = 0; index < 200; index += 1) world.update(1 / 60);
        return { ...scored, battleNumber: world.battleNumber, startingBattle, persistedScore: world.stats.factions.earth.score };
    });
    expect(battle).toMatchObject({ score: 1, state: "warp", persistedScore: 1 });
    expect(battle.battleNumber).toBeGreaterThan(battle.startingBattle);

    await page.reload();
    await page.waitForFunction(() => window.pixelFleetApp && window.pixelFleetApp.frameCount > 1);
    expect(await page.evaluate(() => window.pixelFleetApp.world.stats.factions.earth.score)).toBe(1);
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ resetstats: { value: true } }));
    expect(await page.evaluate(() => ({
        scores: Object.values(window.pixelFleetApp.world.stats.factions).map((faction) => faction.score),
        systemsVisited: window.pixelFleetApp.world.stats.systemsVisited
    }))).toEqual({ scores: [0, 0, 0], systemsVisited: 0 });
});

test("FPS limit, pause, and double-click interaction are honored", async ({ page }) => {
    await openWallpaper(page);
    await page.evaluate(() => window.wallpaperPropertyListener.applyGeneralProperties({ fps: 10 }));
    const before = await page.evaluate(() => window.pixelFleetApp.frameCount);
    await page.waitForTimeout(550);
    const after = await page.evaluate(() => window.pixelFleetApp.frameCount);
    expect(after - before).toBeGreaterThanOrEqual(3);
    expect(after - before).toBeLessThanOrEqual(7);
    const target = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships.find((item) => item.state === "active");
        return { x: ship.x / app.world.width * innerWidth, y: ship.y / app.world.height * innerHeight, id: ship.id };
    });
    await page.mouse.dblclick(target.x, target.y);
    expect(await page.evaluate((id) => window.pixelFleetApp.world.ships.find((ship) => ship.id === id).state, target.id)).toBe("exploding");
    await page.evaluate(() => window.wallpaperPropertyListener.setPaused(true));
    const paused = await page.evaluate(() => ({ frame: window.pixelFleetApp.frameCount, time: window.pixelFleetApp.world.time }));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => ({ frame: window.pixelFleetApp.frameCount, time: window.pixelFleetApp.world.time }))).toEqual(paused);
});

test("auto quality stays inside the ultrawide pixel budget", async ({ page }) => {
    await openWallpaper(page, 5120, 1440);
    const buffer = await page.evaluate(() => ({
        width: window.pixelFleetApp.renderer.canvas.width,
        height: window.pixelFleetApp.renderer.canvas.height,
        worldRatio: window.pixelFleetApp.world.width / window.pixelFleetApp.world.height
    }));
    expect(buffer.width * buffer.height).toBeLessThanOrEqual(8294400);
    expect(buffer.worldRatio).toBeCloseTo(5120 / 1440, 5);
});

test("camera zoom-out expands the wide baseline while preserving normalized ship positions", async ({ page }) => {
    await openWallpaper(page);
    const before = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships[0];
        return { width: app.world.width, height: app.world.height, x: ship.x / app.world.width, y: ship.y / app.world.height };
    });
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ zoom: { value: 2 } }));
    const after = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships[0];
        return { width: app.world.width, height: app.world.height, x: ship.x / app.world.width, y: ship.y / app.world.height };
    });
    expect(after.width).toBeCloseTo(before.width * 2, 5);
    expect(after.height).toBeCloseTo(before.height * 2, 5);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
});

test("scoreboard appearance controls and star hiding affect rendering", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        window.wallpaperPropertyListener.applyUserProperties({
            stars: { value: "never" }, showscore: { value: true }, scoresize: { value: 150 },
            scoreopacity: { value: 60 }, scorecolor: { value: "0.2 0.6 1" },
            scorebackground: { value: true }, scorebackgroundopacity: { value: 70 }
        });
        const calls = [];
        const originalFillRect = app.renderer.context.fillRect.bind(app.renderer.context);
        const originalFillText = app.renderer.context.fillText.bind(app.renderer.context);
        app.renderer.context.fillRect = (...arguments_) => {
            calls.push({ kind: "rect", arguments_, fillStyle: app.renderer.context.fillStyle });
            originalFillRect(...arguments_);
        };
        app.renderer.context.fillText = (...arguments_) => {
            calls.push({ kind: "text", arguments_, fillStyle: app.renderer.context.fillStyle, font: app.renderer.context.font });
            originalFillText(...arguments_);
        };
        app.renderer.draw(app.world, app.settings, 60);
        return {
            stars: app.world.background.stars,
            text: calls.find((call) => call.kind === "text" && call.arguments_[0].startsWith("Earth:")),
            backdrop: calls.find((call) => call.kind === "rect" && call.fillStyle === "rgba(0, 0, 0, 0.7)")
        };
    });
    expect(result.stars).toBe(false);
    expect(result.text.fillStyle).toBe("rgba(51, 153, 255, 0.6)");
    expect(result.text.font).toContain("23px monospace");
    expect(result.backdrop).toBeDefined();
});

test("portrait and live resize preserve aspect ratio and ship placement", async ({ page }) => {
    await openWallpaper(page, 390, 844);
    expect(await page.evaluate(() => window.pixelFleetApp.world.width / window.pixelFleetApp.world.height)).toBeCloseTo(390 / 844, 5);
    const before = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships[0];
        return { id: ship.id, x: ship.x / app.world.width, y: ship.y / app.world.height };
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForFunction(() => Math.abs(window.pixelFleetApp.world.width / window.pixelFleetApp.world.height - 1280 / 720) < 0.00001);
    const after = await page.evaluate((id) => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships.find((item) => item.id === id);
        return { x: ship.x / app.world.width, y: ship.y / app.world.height };
    }, before.id);
    expect(after.x).toBeCloseTo(before.x, 2);
    expect(after.y).toBeCloseTo(before.y, 2);
});

test("ships wrap safely from large negative coordinates", async ({ page }) => {
    await openWallpaper(page);
    const position = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        const ship = app.world.ships[0];
        ship.x = -app.world.width * 2 - 10;
        ship.y = -app.world.height * 2 - 10;
        ship.speed = 0;
        app.world.update(1 / 60);
        return { x: ship.x, y: ship.y, width: app.world.width, height: app.world.height };
    });
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThan(position.width);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeLessThan(position.height);
});

test("maximum settings create a 70-ship battle", async ({ page }) => {
    await openWallpaper(page);
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({
        capitalships: { value: 20 }, fighters: { value: 30 }, bombers: { value: 20 }, asteroidbelt: { value: "never" }
    }));
    const counts = await page.evaluate(() => {
        const ships = window.pixelFleetApp.world.ships;
        return Object.fromEntries(["capital", "fighter", "bomber"].map((type) => [type, ships.filter((ship) => ship.type === type).length]));
    });
    expect(counts).toEqual({ capital: 20, fighter: 30, bomber: 20 });
});

test("all APK ship classes use their distinct weapon batteries and shields", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const shooter = world.ships[0];
        const target = world.ships.find((ship) => ship.faction !== shooter.faction);
        const profile = (sprite, faction, type, shield = 100) => {
            world.projectiles.length = 0;
            world.effects.length = 0;
            Object.assign(shooter, { sprite, faction, type });
            shooter.weaponBatteries = null;
            target.shield = shield;
            world.fire(shooter, target);
            const weapons = world.projectiles.map((projectile) => projectile.weapon);
            weapons.push(...world.effects.filter((effect) => effect.kind === "beam").map(() => "beam"));
            return Object.fromEntries([...new Set(weapons)].sort().map((weapon) => [weapon, weapons.filter((value) => value === weapon).length]));
        };
        const weapons = {
            earthCruiser: profile("cruiser_1_4x.png", "earth", "capital"),
            earthMissileFrigate: profile("earth_missile_cruiser_4x.png", "earth", "capital"),
            glieseDreadnaught: profile("gliese_dreadnaught_4x.png", "gliese", "capital"),
            glieseCorvette: profile("gliese_corvette.png", "gliese", "capital"),
            eridaniGunboatShielded: profile("epsilon_eridani_gunboat.png", "eridani", "capital"),
            eridaniGunboatHull: profile("epsilon_eridani_gunboat.png", "eridani", "capital", 0),
            eridaniDestroyer: profile("epsilon_eridani_destroyer.png", "eridani", "capital"),
            earthFighter: profile("earth_fighter.png", "earth", "fighter"),
            glieseFighter: profile("gliese_fighter.png", "gliese", "fighter"),
            eridaniFighter: profile("eridani_fighter.png", "eridani", "fighter"),
            earthBomber: profile("earth_bomber.png", "earth", "bomber"),
            glieseBomber: profile("gliese_bomber.png", "gliese", "bomber"),
            eridaniBomberShielded: profile("eridani_bomber.png", "eridani", "bomber"),
            eridaniBomberHull: profile("eridani_bomber.png", "eridani", "bomber", 0)
        };
        const originalSpawnPick = world.random.pick;
        const spawnProfile = (sprite, type, faction) => {
            world.random.pick = (values) => values.find((value) => value.sprite === sprite) || values[0];
            world.spawnShip(type, faction);
            const spawned = world.ships.at(-1);
            return {
                hull: spawned.maxHealth,
                shield: spawned.maxShield,
                speed: spawned.maxSpeed,
                turnRate: Number(spawned.turnRate.toFixed(6)),
                shieldAttackThreshold: spawned.ai.shieldAttackThreshold,
                keepDistance: Boolean(spawned.ai.keepDistance),
                straightAttackPath: Boolean(spawned.ai.straightAttackPath),
                attackRuns: Boolean(spawned.ai.attackRuns),
                weapons: spawned.weaponBatteries.map((battery) => ({
                    weapon: battery.weapon,
                    secondary: battery.secondary || null,
                    count: battery.count,
                    damage: battery.damage,
                    cooldown: battery.cooldown,
                    mount: battery.mount,
                    burst: battery.burst || 1,
                    burstCooldown: battery.burstCooldown || null
                }))
            };
        };
        const parameters = {
            earthCruiser: spawnProfile("cruiser_1_4x.png", "capital", "earth"),
            earthMissileFrigate: spawnProfile("earth_missile_cruiser_4x.png", "capital", "earth"),
            glieseDreadnaught: spawnProfile("gliese_dreadnaught_4x.png", "capital", "gliese"),
            glieseCorvette: spawnProfile("gliese_corvette.png", "capital", "gliese"),
            eridaniGunboat: spawnProfile("epsilon_eridani_gunboat.png", "capital", "eridani"),
            eridaniDestroyer: spawnProfile("epsilon_eridani_destroyer.png", "capital", "eridani"),
            earthFighter: spawnProfile("earth_fighter.png", "fighter", "earth"),
            glieseFighter: spawnProfile("gliese_fighter.png", "fighter", "gliese"),
            eridaniFighter: spawnProfile("eridani_fighter.png", "fighter", "eridani"),
            earthBomber: spawnProfile("earth_bomber.png", "bomber", "earth"),
            glieseBomber: spawnProfile("gliese_bomber.png", "bomber", "gliese"),
            eridaniBomber: spawnProfile("eridani_bomber.png", "bomber", "eridani")
        };
        const earthCruiserWeapons = parameters.earthCruiser.weapons;
        parameters.earthCruiser.weapons = [];
        world.random.pick = originalSpawnPick;

        target.shield = 0;
        target.health = 1000;
        target.systems.shields = 100;
        const attackerSystemsBefore = world.stats.factions.earth.systemsDestroyed;
        const victimSystemsBefore = world.stats.factions[target.faction].systemsDestroyed;
        const originalNext = world.random.next;
        const originalPick = world.random.pick;
        world.random.next = () => 0;
        world.random.pick = () => "shields";
        world.damageShip(target, 150, "earth");
        world.random.next = originalNext;
        world.random.pick = originalPick;
        const subsystemDestroyed = {
            attacker: world.stats.factions.earth.systemsDestroyed - attackerSystemsBefore,
            victim: world.stats.factions[target.faction].systemsDestroyed - victimSystemsBefore,
            shieldHealth: target.systems.shields
        };

        target.shield = 100;
        target.health = 100;
        world.damageShip(target, 10, "earth", 2, 0, "ion");
        const ionDamage = { shield: 100 - target.shield, hull: 100 - target.health };
        target.shield = 0;
        target.health = 100;
        world.damageShip(target, 10, "earth", 1, 2, "missile");
        const missileHullDamage = 100 - target.health;
        target.shield = 5;
        target.health = 100;
        target.shieldRechargeDelay = 0;
        world.damageShip(target, 10, "earth", 1, 2, "missile");
        const shieldCollapse = { shield: target.shield, health: target.health, delay: target.shieldRechargeDelay };

        const asteroid = world.asteroids.find((item) => !item.belt);
        asteroid.size = 10;
        target.shield = 100;
        target.health = 100;
        asteroid.x = (target.x + target.radius + 10) / world.width;
        asteroid.y = target.y / world.height;
        asteroid.hitTimer = 0;
        world.updateBackground(1 / 60);
        const asteroidShieldDamage = { shield: target.shield, health: target.health };
        target.shield = 0;
        target.health = 100;
        asteroid.x = target.x / world.width;
        asteroid.hitTimer = 0;
        world.updateBackground(1 / 60);
        const asteroidHullDamage = 100 - target.health;
        return { weapons, parameters, earthCruiserWeapons, subsystemDestroyed, ionDamage, missileHullDamage, shieldCollapse, asteroidShieldDamage, asteroidHullDamage };
    });
    expect(result.weapons).toEqual({
        earthCruiser: { beam: 1, laser: 4 },
        earthMissileFrigate: { missile: 6 },
        glieseDreadnaught: { laser: 6 },
        glieseCorvette: { beam: 6 },
        eridaniGunboatShielded: { ion: 4 },
        eridaniGunboatHull: { laser: 4 },
        eridaniDestroyer: { ion: 6 },
        earthFighter: { laser: 2 },
        glieseFighter: { laser: 2 },
        eridaniFighter: { laser: 1 },
        earthBomber: { ion: 1, missile: 2 },
        glieseBomber: { beam: 2 },
        eridaniBomberShielded: { ion: 1 },
        eridaniBomberHull: { laser: 1 }
    });
    const weapon = (type, count, damage, cooldown, mount, secondary = null, burst = 1, burstCooldown = null) => ({
        weapon: type, secondary, count, damage, cooldown, mount, burst, burstCooldown
    });
    expect(result.earthCruiserWeapons).toHaveLength(5);
    expect(result.earthCruiserWeapons.every((battery) => battery.count === 1 && battery.mount === "turret")).toBe(true);
    expect(result.earthCruiserWeapons.every((battery) => ["laser", "ion", "beam", "missile", "none"].includes(battery.weapon))).toBe(true);
    expect(result.parameters).toEqual({
        earthCruiser: { hull: 700, shield: 200, speed: 100, turnRate: 0.436332, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: false, attackRuns: false, weapons: [] },
        earthMissileFrigate: { hull: 700, shield: 200, speed: 50, turnRate: 0.349066, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: false, attackRuns: false, weapons: [weapon("missile", 6, 20, 2, "port")] },
        glieseDreadnaught: { hull: 500, shield: 200, speed: 50, turnRate: 0.523599, shieldAttackThreshold: -Infinity, keepDistance: false, straightAttackPath: true, attackRuns: false, weapons: [weapon("laser", 6, 6, 0.25, "point")] },
        glieseCorvette: { hull: 500, shield: 200, speed: 70, turnRate: 0.523599, shieldAttackThreshold: -Infinity, keepDistance: false, straightAttackPath: true, attackRuns: false, weapons: [weapon("beam", 6, 26.4, 1.1, "point")] },
        eridaniGunboat: { hull: 290, shield: 270, speed: 100, turnRate: 0.698132, shieldAttackThreshold: 0.75, keepDistance: true, straightAttackPath: false, attackRuns: false, weapons: [weapon("ion", 4, 11, 1.5, "turret", "laser")] },
        eridaniDestroyer: { hull: 350, shield: 250, speed: 40, turnRate: 0.436332, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: false, attackRuns: false, weapons: [weapon("ion", 6, 11, 1.5, "turret", "laser")] },
        earthFighter: { hull: 55, shield: 20, speed: 300, turnRate: 1.745329, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: true, attackRuns: true, weapons: [weapon("laser", 2, 2.5, 0.25, "point")] },
        glieseFighter: { hull: 50, shield: 20, speed: 200, turnRate: 1.919862, shieldAttackThreshold: -Infinity, keepDistance: false, straightAttackPath: true, attackRuns: true, weapons: [weapon("laser", 2, 2.5, 0.25, "point")] },
        eridaniFighter: { hull: 40, shield: 40, speed: 140, turnRate: 1.22173, shieldAttackThreshold: 0.5, keepDistance: true, straightAttackPath: false, attackRuns: false, weapons: [weapon("laser", 1, 3, 0.25, "turret")] },
        earthBomber: { hull: 100, shield: 40, speed: 80, turnRate: 0.698132, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: true, attackRuns: true, weapons: [weapon("missile", 2, 10, 2, "point"), weapon("ion", 1, 2.5, 0.25, "turret")] },
        glieseBomber: { hull: 100, shield: 40, speed: 80, turnRate: 0.698132, shieldAttackThreshold: -Infinity, keepDistance: false, straightAttackPath: true, attackRuns: true, weapons: [weapon("beam", 2, 1.68, 0.15, "point")] },
        eridaniBomber: { hull: 75, shield: 60, speed: 80, turnRate: 0.698132, shieldAttackThreshold: 0.5, keepDistance: false, straightAttackPath: false, attackRuns: false, weapons: [weapon("ion", 1, 3, 0.05, "turret", "laser", 5, 0.55)] }
    });
    expect(result).toMatchObject({
        subsystemDestroyed: { attacker: 0, victim: 1, shieldHealth: 0 },
        ionDamage: { shield: 20, hull: 0 },
        missileHullDamage: 20,
        shieldCollapse: { shield: 0, health: 100, delay: 3 },
        asteroidShieldDamage: { shield: 93, health: 100 }
    });
    expect(result.asteroidHullDamage).toBeCloseTo(8.4, 5);
});

test("APK projectile guidance, collision, burst, and ion disable semantics are preserved", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const shooter = world.ships.find((ship) => ship.faction === "earth");
        const blocker = world.ships.find((ship) => ship.faction === "gliese");
        const intended = world.ships.find((ship) => ship.faction === "eridani");
        Object.assign(shooter, { x: 100, y: 100, state: "active" });
        Object.assign(blocker, { x: 200, y: 100, state: "active", health: 100, maxHealth: 100, shield: 0 });
        Object.assign(intended, { x: 400, y: 100, state: "active", health: 100, maxHealth: 100, shield: 0 });
        world.ships = [shooter, blocker, intended];
        world.projectiles = [{
            x: 200, y: 100, vx: 0, vy: 0, angle: 0, targetId: intended.id,
            faction: "earth", damage: 5, shieldDamage: 1, hullDamage: 1,
            life: 1, missile: false, weapon: "laser", color: "#fff"
        }];
        world.updateProjectiles(0);
        const firstContact = { blocker: blocker.health, intended: intended.health };

        blocker.shield = 100;
        world.projectiles = [{
            x: blocker.x + blocker.radius + 10, y: blocker.y, vx: 0, vy: 0, angle: 0, targetId: blocker.id,
            faction: "earth", damage: 5, shieldDamage: 1, hullDamage: 1,
            life: 1, missile: false, weapon: "laser", color: "#fff"
        }];
        world.updateProjectiles(0);
        const shieldShell = { shield: blocker.shield, projectiles: world.projectiles.length };

        blocker.state = "disabled";
        blocker.health = 100;
        world.projectiles = [{
            x: blocker.x, y: blocker.y, vx: 0, vy: 0, angle: 0, targetId: blocker.id,
            faction: "earth", damage: 5, shieldDamage: 1, hullDamage: 1,
            life: 1, missile: false, weapon: "laser", color: "#fff"
        }];
        world.updateProjectiles(0);
        const disabledHit = { shield: blocker.shield, health: blocker.health };
        blocker.state = "active";

        world.projectiles = [{
            x: 110, y: 100, vx: 100, vy: 0, angle: 0, targetId: -1,
            faction: "earth", damage: 10, shieldDamage: 1, hullDamage: 2,
            life: 4, missile: true, weapon: "missile", size: 16, color: "#fff"
        }];
        world.updateProjectiles(0);
        const reacquiredTarget = world.projectiles[0].targetId;

        blocker.shield = 0;
        blocker.ionIntegrity = 5;
        blocker.state = "active";
        world.damageShip(blocker, 5, "eridani", 2, 0, "ion");
        const disabled = { state: blocker.state, timer: blocker.disabledTimer };
        world.updateShip(blocker, 5.1);
        const recovered = { state: blocker.state, ionIntegrity: blocker.ionIntegrity };

        const bomber = world.ships.find((ship) => ship.sprite === "eridani_bomber.png") || shooter;
        Object.assign(bomber, {
            sprite: "eridani_bomber.png", faction: "eridani", type: "bomber", state: "active",
            weaponBatteries: [{ weapon: "ion", secondary: "laser", count: 1, damage: 3, cooldown: 0.05, burst: 5, burstCooldown: 0.55, mount: "turret" }],
            weaponTimers: [0], weaponBursts: [5], systems: { ...bomber.systems, weapons: 100 }
        });
        blocker.faction = "earth";
        blocker.shield = 100;
        world.projectiles.length = 0;
        const burstShots = [];
        for (let shot = 0; shot < 5; shot += 1) {
            world.updateWeaponSystems(bomber, blocker, 0);
            burstShots.push(world.projectiles.length);
            if (shot < 4) bomber.weaponTimers[0] = 0;
        }
        return { firstContact, shieldShell, disabledHit, reacquiredTarget, expectedReacquiredTarget: blocker.id, disabled, recovered, burstShots, burstCooldown: bomber.weaponTimers[0] };
    });
    expect(result.firstContact).toEqual({ blocker: 95, intended: 100 });
    expect(result.shieldShell).toEqual({ shield: 95, projectiles: 0 });
    expect(result.disabledHit).toEqual({ shield: 95, health: 95 });
    expect(result.reacquiredTarget).toBe(result.expectedReacquiredTarget);
    expect(result.disabled).toEqual({ state: "disabled", timer: 5 });
    expect(result.recovered).toEqual({ state: "active", ionIntegrity: 100 });
    expect(result.burstShots).toEqual([1, 2, 3, 4, 5]);
    expect(result.burstCooldown).toBe(0.55);
});

test("APK explosions and ship debris damage nearby ships", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const source = world.ships.find((ship) => ship.faction === "earth" && ship.type === "capital");
        const enemy = world.ships.find((ship) => ship.faction === "gliese" && ship.type === "capital");
        const friendly = world.ships.find((ship) => ship.faction === "earth" && ship.id !== source.id);
        Object.assign(source, { x: 300, y: 300, state: "active" });
        Object.assign(enemy, { x: 380, y: 300, state: "active", shield: 0, health: 500, maxHealth: 500 });
        Object.assign(friendly, { x: 360, y: 300, state: "active", shield: 0, health: 500, maxHealth: 500 });
        world.ships = [source, enemy, friendly];
        world.effects = [];
        world.destroyShip(source);
        world.updateShip(source, 0.75);
        const explosion = { enemyHealth: enemy.health, friendlyHealth: friendly.health };

        enemy.shield = 100;
        enemy.health = 500;
        world.effects = [{
            kind: "debris", x: enemy.x + enemy.radius + 10, y: enemy.y, age: 0, life: 5,
            size: 8, vx: 0, vy: 0, angle: 0, spin: 0, sprite: "ship_debris_1.png"
        }];
        world.updateEffects(0);
        return { explosion, debris: { shield: enemy.shield, health: enemy.health, remaining: world.effects.length } };
    });
    expect(result.explosion).toEqual({ enemyHealth: 308, friendlyHealth: 500 });
    expect(result.debris).toEqual({ shield: 95, health: 500, remaining: 0 });
});

test("Free for All targets same-faction ships and suppresses the score overlay", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        window.wallpaperPropertyListener.applyUserProperties({ simulationmode: { value: "freeforall" }, showscore: { value: true } });
        const app = window.pixelFleetApp;
        const earthShips = app.world.ships.filter((ship) => ship.faction === "earth").slice(0, 3);
        Object.assign(earthShips[0], { x: 100, y: 100, state: "active" });
        Object.assign(earthShips[1], { x: 300, y: 100, state: "active", shield: 0, health: 100 });
        Object.assign(earthShips[2], { x: 700, y: 100, state: "active" });
        app.world.ships = earthShips;
        const target = app.world.findTarget(earthShips[0]);
        app.world.projectiles = [{
            x: earthShips[1].x, y: earthShips[1].y, vx: 0, vy: 0, angle: 0, targetId: earthShips[1].id,
            faction: "earth", damage: 5, shieldDamage: 1, hullDamage: 1,
            life: 1, missile: false, weapon: "laser", color: "#fff"
        }];
        app.world.updateProjectiles(0);
        earthShips[1].state = "exploding";
        app.world.projectiles = [{
            x: 350, y: 400, vx: 250, vy: 0, angle: 0, targetId: earthShips[1].id, sourceId: earthShips[0].id,
            faction: "earth", damage: 20, shieldDamage: 1, hullDamage: 2,
            life: 1, missile: true, weapon: "missile", size: 22, color: "#fff"
        }];
        app.world.updateProjectiles(0);
        const missileTargetId = app.world.projectiles[0].targetId;
        const calls = [];
        const originalFillText = app.renderer.context.fillText.bind(app.renderer.context);
        app.renderer.context.fillText = (...arguments_) => {
            calls.push(arguments_[0]);
            originalFillText(...arguments_);
        };
        app.renderer.draw(app.world, app.settings, 60);
        return {
            targetId: target && target.id,
            expectedId: earthShips[1].id,
            missileTargetId,
            expectedMissileTargetId: earthShips[2].id,
            friendlyHealth: earthShips[1].health,
            scoreDrawn: calls.some((text) => text.startsWith("Earth:"))
        };
    });
    expect(result).toEqual({
        targetId: result.expectedId,
        expectedId: result.expectedId,
        missileTargetId: result.expectedMissileTargetId,
        expectedMissileTargetId: result.expectedMissileTargetId,
        friendlyHealth: 95,
        scoreDrawn: false
    });
});

test("debris and slow motion update live, and one-faction configurations complete", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const app = window.pixelFleetApp;
        window.wallpaperPropertyListener.applyUserProperties({ debris: { value: false }, slowmotion: { value: true } });
        app.world.effects.length = 0;
        app.world.destroyShip(app.world.ships[0]);
        app.world.update(0.2);
        const debrisWhileDisabled = app.world.effects.some((effect) => effect.kind === "debris");
        const slowedScale = app.world.slowScale;
        window.wallpaperPropertyListener.applyUserProperties({ slowmotion: { value: false } });
        app.world.update(0.2);
        const resumedScale = app.world.slowScale;

        const disableAllButEarth = {
            spawnearthmissilefrigate: { value: false }, spawnearthfighter: { value: false }, spawnearthbomber: { value: false },
            spawngliesecorvette: { value: false }, spawngliesedreadnaught: { value: false }, spawngliesefighter: { value: false },
            spawngliesebomber: { value: false }, spawneridanigunboat: { value: false }, spawneridanidestroyer: { value: false },
            spawneridanifighter: { value: false }, spawneridanibomber: { value: false }
        };
        window.wallpaperPropertyListener.applyUserProperties(disableAllButEarth);
        const battleNumber = app.world.battleNumber;
        for (let index = 0; index < 300; index += 1) app.world.update(1 / 60);
        return {
            debrisWhileDisabled,
            slowedScale,
            resumedScale,
            battleNumber,
            finalBattleNumber: app.world.battleNumber,
            factionCount: app.world.battleFactionCount
        };
    });
    expect(result.debrisWhileDisabled).toBe(false);
    expect(result.slowedScale).toBeLessThan(1);
    expect(result.resumedScale).toBeGreaterThan(result.slowedScale);
    expect(result.finalBattleNumber).toBeGreaterThan(result.battleNumber);
    expect(result.factionCount).toBe(1);
});