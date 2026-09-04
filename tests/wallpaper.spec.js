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
        return {
            litPixels,
            shipCount: app.world.ships.length,
            types: [...new Set(app.world.ships.map((ship) => ship.type))],
            factions: [...new Set(app.world.ships.map((ship) => ship.faction))],
            loadedAssets: app.renderer.images.size
        };
    });
    expect(state.litPixels).toBeGreaterThan(1000);
    expect(state.shipCount).toBe(24);
    expect(state.types.sort()).toEqual(["bomber", "capital", "fighter"]);
    expect(state.factions.sort()).toEqual(["earth", "eridani", "gliese"]);
    expect(state.loadedAssets).toBe(44);
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
        world.restart();
        const secondLayout = world.ships.map((ship) => [ship.sprite, ship.x, ship.y]);
        return { distances, earthHealth, firstLayout, secondLayout };
    });
    expect(Math.max(...state.distances) / Math.min(...state.distances)).toBeLessThan(1.25);
    expect(state.earthHealth).toEqual({ capital: [540], fighter: [50], bomber: [100] });
    expect(state.secondLayout).not.toEqual(state.firstLayout);
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
        world.fire(ship, target);
        const beamTargetX = world.effects.find((effect) => effect.kind === "beam").targetX;

        world.projectiles = [{
            x: world.width - 1, y: 20, vx: 120, vy: 0, angle: 0, targetId: 0,
            faction: ship.faction, damage: 1, life: 2, missile: false, weapon: "laser", color: "#fff"
        }];
        world.updateProjectiles(1 / 30);
        const projectileX = world.projectiles[0].x;

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
        renderer.drawShip(renderer.context, ship, world);
        renderer.drawSprite = originalDrawSprite;
        renderer.drawWarp = originalDrawWarp;
        return { selectedAcrossEdge, shortestOffset, beamTargetX, targetX: target.x, worldWidth: world.width, projectileX, asteroidHitAcrossEdge, destroyedAcrossEdge, positions, spriteNames, warpFlares };
    });
    expect(result.selectedAcrossEdge).toBe(true);
    expect(result.shortestOffset).toBe(10);
    expect(result.beamTargetX).toBe(result.worldWidth + result.targetX);
    expect(result.projectileX).toBe(3);
    expect(result.asteroidHitAcrossEdge).toBe(true);
    expect(result.destroyedAcrossEdge).toBe(true);
    expect(result.positions.some(([x]) => x > 1)).toBe(true);
    expect(result.positions.some(([x]) => x === result.beamTargetX)).toBe(true);
    expect(result.spriteNames).not.toContain("warp.png");
    expect(result.warpFlares).toBe(1);
});

test("fleet simulation moves, targets, and fires", async ({ page }) => {
    await openWallpaper(page);
    const initial = await page.evaluate(() => ({
        x: window.pixelFleetApp.world.ships[0].x,
        y: window.pixelFleetApp.world.ships[0].y,
        time: window.pixelFleetApp.world.time
    }));
    await page.waitForTimeout(2200);
    const result = await page.evaluate(() => ({
        x: window.pixelFleetApp.world.ships[0].x,
        y: window.pixelFleetApp.world.ships[0].y,
        time: window.pixelFleetApp.world.time,
        targets: window.pixelFleetApp.world.ships.filter((ship) => ship.targetId).length,
        activeOrHit: window.pixelFleetApp.world.projectiles.length + window.pixelFleetApp.world.effects.length
    }));
    expect(Math.hypot(result.x - initial.x, result.y - initial.y)).toBeGreaterThan(1);
    expect(result.time).toBeGreaterThan(initial.time + 1);
    expect(result.targets).toBeGreaterThan(10);
    expect(result.activeOrHit).toBeGreaterThan(0);
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

test("beams, ion fire, subsystem damage, and asteroid collisions are functional", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        const world = window.pixelFleetApp.world;
        const shooter = world.ships[0];
        const target = world.ships.find((ship) => ship.faction !== shooter.faction);
        shooter.sprite = "gliese_corvette.png";
        shooter.faction = "gliese";
        const durabilityBeforeBeam = target.health + target.shield;
        world.fire(shooter, target);
        const beam = world.effects.some((effect) => effect.kind === "beam");
        const beamDamage = durabilityBeforeBeam - target.health - target.shield;
        shooter.sprite = "epsilon_eridani_gunboat.png";
        shooter.faction = "eridani";
        world.fire(shooter, target);
        const ionDamage = world.projectiles.find((projectile) => projectile.weapon === "ion").damage;
        shooter.sprite = "earth_missile_cruiser_4x.png";
        shooter.faction = "earth";
        world.fire(shooter, target);
        const capitalMissileDamage = world.projectiles.find((projectile) => projectile.weapon === "missile").damage;

        target.shield = 0;
        target.health = 1000;
        target.systems.shields = 100;
        const systemsBefore = world.stats.factions.earth.systemsDestroyed;
        const originalNext = world.random.next;
        const originalPick = world.random.pick;
        world.random.next = () => 0;
        world.random.pick = () => "shields";
        world.damageShip(target, 150, "earth");
        world.random.next = originalNext;
        world.random.pick = originalPick;
        const subsystemDestroyed = world.stats.factions.earth.systemsDestroyed > systemsBefore && target.systems.shields === 0;

        const asteroid = world.asteroids.find((item) => !item.belt);
        asteroid.x = target.x / world.width;
        asteroid.y = target.y / world.height;
        asteroid.hitTimer = 0;
        const durabilityBefore = target.health + target.shield;
        world.updateBackground(1 / 60);
        return { beam, beamDamage, ionDamage, capitalMissileDamage, subsystemDestroyed, asteroidDamage: target.health + target.shield < durabilityBefore };
    });
    expect(result).toEqual({ beam: true, beamDamage: 12, ionDamage: 22, capitalMissileDamage: 24, subsystemDestroyed: true, asteroidDamage: true });
});

test("Free for All targets same-faction ships and suppresses the score overlay", async ({ page }) => {
    await openWallpaper(page);
    const result = await page.evaluate(() => {
        window.wallpaperPropertyListener.applyUserProperties({ simulationmode: { value: "freeforall" }, showscore: { value: true } });
        const app = window.pixelFleetApp;
        const earthShips = app.world.ships.filter((ship) => ship.faction === "earth").slice(0, 2);
        app.world.ships = earthShips;
        const target = app.world.findTarget(earthShips[0]);
        const calls = [];
        const originalFillText = app.renderer.context.fillText.bind(app.renderer.context);
        app.renderer.context.fillText = (...arguments_) => {
            calls.push(arguments_[0]);
            originalFillText(...arguments_);
        };
        app.renderer.draw(app.world, app.settings, 60);
        return { targetId: target && target.id, expectedId: earthShips[1].id, scoreDrawn: calls.some((text) => text.startsWith("Earth:")) };
    });
    expect(result).toEqual({ targetId: result.expectedId, expectedId: result.expectedId, scoreDrawn: false });
});

test("debris and slow motion settings update live, and one-faction configurations stay stable", async ({ page }) => {
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
    expect(result.finalBattleNumber).toBe(result.battleNumber);
    expect(result.factionCount).toBe(1);
});