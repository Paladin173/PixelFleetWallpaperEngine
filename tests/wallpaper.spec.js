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
    expect(Object.keys(project.general.properties)).toHaveLength(38);
    const originalSettings = [
        "simulationmode", "capitalships", "fighters", "bombers", "asteroids", "stars", "spacedust", "planets",
        "asteroidbelt", "debris", "slowmotion", "autobalance", "interaction", "brightness", "showscore",
        "scoreorientation", "scorehorizontaloffset", "scoreverticaloffset", "resetstats", "spawnearthcruiser",
        "spawnearthmissilefrigate", "spawnearthfighter", "spawnearthbomber", "spawngliesecorvette",
        "spawngliesedreadnaught", "spawngliesefighter", "spawngliesebomber", "spawneridanigunboat",
        "spawneridanidestroyer", "spawneridanifighter", "spawneridanibomber", "showhitboxes", "showhpbars",
        "showshipmovement", "showshipstate", "showprojectiletargets", "showfps"
    ];
    for (const key of originalSettings) expect(project.general.properties[key]).toBeDefined();
    expect(project.general.properties.scorehorizontaloffset).toMatchObject({ type: "slider", min: -120, max: 120, value: 0 });
    expect(project.general.properties.scoreverticaloffset).toMatchObject({ type: "slider", min: 0, max: 240, value: 0 });
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
        world.fire(shooter, target);
        const beam = world.effects.some((effect) => effect.kind === "beam");
        shooter.sprite = "epsilon_eridani_gunboat.png";
        shooter.faction = "eridani";
        world.fire(shooter, target);
        const ion = world.projectiles.some((projectile) => projectile.weapon === "ion");

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
        return { beam, ion, subsystemDestroyed, asteroidDamage: target.health + target.shield < durabilityBefore };
    });
    expect(result).toEqual({ beam: true, ion: true, subsystemDestroyed: true, asteroidDamage: true });
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