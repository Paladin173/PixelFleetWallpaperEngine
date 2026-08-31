(function () {
    "use strict";

    const defaults = {
        renderQuality: "auto",
        simulationMode: "survival",
        capitalShips: 6,
        fighters: 12,
        bombers: 6,
        asteroids: 30,
        stars: "randomly",
        spaceDust: "randomly",
        planets: "randomly",
        asteroidBelt: "randomly",
        debris: true,
        slowMotion: true,
        autoBalance: true,
        interaction: true,
        brightness: 100,
        showScore: false,
        scoreOrientation: "bottom",
        scoreHorizontalOffset: 0,
        scoreVerticalOffset: 0,
        resetStats: false,
        spawnEarthCruiser: true,
        spawnEarthMissileFrigate: true,
        spawnEarthFighter: true,
        spawnEarthBomber: true,
        spawnGlieseCorvette: true,
        spawnGlieseDreadnaught: true,
        spawnGlieseFighter: true,
        spawnGlieseBomber: true,
        spawnEridaniGunboat: true,
        spawnEridaniDestroyer: true,
        spawnEridaniFighter: true,
        spawnEridaniBomber: true,
        showHitboxes: false,
        showHpBars: false,
        showShipMovement: false,
        showShipState: false,
        showProjectileTargets: false,
        showFps: false
    };

    function value(property, fallback) {
        if (property === undefined || property === null) return fallback;
        return property && typeof property === "object" && "value" in property ? property.value : property;
    }

    function booleanValue(property, fallback) {
        const resolved = value(property, fallback);
        if (typeof resolved === "string") return resolved === "1" || resolved.toLowerCase() === "true";
        return Boolean(resolved);
    }

    function numberValue(property, fallback) {
        const resolved = Number(value(property, fallback));
        return Number.isFinite(resolved) ? resolved : fallback;
    }

    window.pixelFleetSettings = { ...defaults };
    window.wallpaperPropertyListener = {
        applyGeneralProperties(properties) {
            if (properties.fps !== undefined && window.pixelFleetApp) {
                window.pixelFleetApp.setFpsLimit(numberValue(properties.fps, 60));
            }
        },
        applyUserProperties(properties) {
            const settings = window.pixelFleetSettings;
            if (properties.renderquality !== undefined) settings.renderQuality = String(value(properties.renderquality, defaults.renderQuality));
            if (properties.simulationmode !== undefined) settings.simulationMode = String(value(properties.simulationmode, defaults.simulationMode));
            if (properties.capitalships !== undefined) settings.capitalShips = numberValue(properties.capitalships, defaults.capitalShips);
            if (properties.fighters !== undefined) settings.fighters = numberValue(properties.fighters, defaults.fighters);
            if (properties.bombers !== undefined) settings.bombers = numberValue(properties.bombers, defaults.bombers);
            if (properties.asteroids !== undefined) settings.asteroids = numberValue(properties.asteroids, defaults.asteroids);
            if (properties.stars !== undefined) settings.stars = String(value(properties.stars, defaults.stars));
            if (properties.spacedust !== undefined) settings.spaceDust = String(value(properties.spacedust, defaults.spaceDust));
            if (properties.planets !== undefined) settings.planets = String(value(properties.planets, defaults.planets));
            if (properties.asteroidbelt !== undefined) settings.asteroidBelt = String(value(properties.asteroidbelt, defaults.asteroidBelt));
            if (properties.debris !== undefined) settings.debris = booleanValue(properties.debris, defaults.debris);
            if (properties.slowmotion !== undefined) settings.slowMotion = booleanValue(properties.slowmotion, defaults.slowMotion);
            if (properties.autobalance !== undefined) settings.autoBalance = booleanValue(properties.autobalance, defaults.autoBalance);
            if (properties.interaction !== undefined) settings.interaction = booleanValue(properties.interaction, defaults.interaction);
            if (properties.brightness !== undefined) settings.brightness = numberValue(properties.brightness, defaults.brightness);
            if (properties.showscore !== undefined) settings.showScore = booleanValue(properties.showscore, defaults.showScore);
            if (properties.scoreorientation !== undefined) settings.scoreOrientation = String(value(properties.scoreorientation, defaults.scoreOrientation));
            if (properties.scorehorizontaloffset !== undefined) settings.scoreHorizontalOffset = numberValue(properties.scorehorizontaloffset, defaults.scoreHorizontalOffset);
            if (properties.scoreverticaloffset !== undefined) settings.scoreVerticalOffset = numberValue(properties.scoreverticaloffset, defaults.scoreVerticalOffset);
            if (properties.resetstats !== undefined) {
                const shouldReset = booleanValue(properties.resetstats, defaults.resetStats);
                if (shouldReset && !settings.resetStats && window.pixelFleetApp) window.pixelFleetApp.clearStats();
                settings.resetStats = shouldReset;
            }
            const booleanProperties = {
                spawnearthcruiser: "spawnEarthCruiser",
                spawnearthmissilefrigate: "spawnEarthMissileFrigate",
                spawnearthfighter: "spawnEarthFighter",
                spawnearthbomber: "spawnEarthBomber",
                spawngliesecorvette: "spawnGlieseCorvette",
                spawngliesedreadnaught: "spawnGlieseDreadnaught",
                spawngliesefighter: "spawnGlieseFighter",
                spawngliesebomber: "spawnGlieseBomber",
                spawneridanigunboat: "spawnEridaniGunboat",
                spawneridanidestroyer: "spawnEridaniDestroyer",
                spawneridanifighter: "spawnEridaniFighter",
                spawneridanibomber: "spawnEridaniBomber",
                showhitboxes: "showHitboxes",
                showhpbars: "showHpBars",
                showshipmovement: "showShipMovement",
                showshipstate: "showShipState",
                showprojectiletargets: "showProjectileTargets",
                showfps: "showFps"
            };
            for (const [propertyName, settingName] of Object.entries(booleanProperties)) {
                if (properties[propertyName] !== undefined) {
                    settings[settingName] = booleanValue(properties[propertyName], defaults[settingName]);
                }
            }
            if (window.pixelFleetApp) window.pixelFleetApp.applySettings(settings);
        },
        setPaused(paused) {
            if (window.pixelFleetApp) window.pixelFleetApp.setPaused(paused);
        }
    };
}());