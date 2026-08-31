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
    expect(state.loadedAssets).toBe(40);
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
        capitalships: { value: 3 }, fighters: { value: 6 }, bombers: { value: 3 }, asteroids: { value: 10 }
    }));
    expect(await page.evaluate(() => window.pixelFleetApp.world.ships.length)).toBe(12);
    expect(await page.evaluate(() => window.pixelFleetApp.world.asteroids.length)).toBe(10);
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ simulationmode: { value: "noships" } }));
    expect(await page.evaluate(() => window.pixelFleetApp.world.ships.length)).toBe(0);
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