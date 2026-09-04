(function () {
    "use strict";

    const defaults = {
        renderQuality: "auto",
        zoom: 1,
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
        scoreSize: 100,
        scoreOpacity: 100,
        scoreColor: "1 1 1",
        scoreBackground: false,
        scoreBackgroundOpacity: 55,
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
            const apply = (propertyName, legacyName, settingName, transform) => {
                const property = properties[propertyName] !== undefined ? properties[propertyName] : properties[legacyName];
                if (property !== undefined) settings[settingName] = transform(property, defaults[settingName]);
            };
            apply("renderquality", "a01renderquality", "renderQuality", (property, fallback) => String(value(property, fallback)));
            apply("zoom", "a02zoom", "zoom", numberValue);
            apply("brightness", "a03brightness", "brightness", numberValue);
            apply("simulationmode", "b01simulationmode", "simulationMode", (property, fallback) => String(value(property, fallback)));
            apply("capitalships", "b02capitalships", "capitalShips", numberValue);
            apply("fighters", "b03fighters", "fighters", numberValue);
            apply("bombers", "b04bombers", "bombers", numberValue);
            apply("asteroids", "c01asteroids", "asteroids", numberValue);
            apply("stars", "c02stars", "stars", (property, fallback) => String(value(property, fallback)));
            apply("spacedust", "c03spacedust", "spaceDust", (property, fallback) => String(value(property, fallback)));
            apply("planets", "c04planets", "planets", (property, fallback) => String(value(property, fallback)));
            apply("asteroidbelt", "c05asteroidbelt", "asteroidBelt", (property, fallback) => String(value(property, fallback)));
            apply("debris", "d01debris", "debris", booleanValue);
            apply("slowmotion", "d02slowmotion", "slowMotion", booleanValue);
            apply("autobalance", "d03autobalance", "autoBalance", booleanValue);
            apply("interaction", "d04interaction", "interaction", booleanValue);
            apply("showscore", "e01showscore", "showScore", booleanValue);
            apply("scoreorientation", "e02scoreorientation", "scoreOrientation", (property, fallback) => String(value(property, fallback)));
            apply("scorehorizontaloffset", "e03scorehorizontaloffset", "scoreHorizontalOffset", numberValue);
            apply("scoreverticaloffset", "e04scoreverticaloffset", "scoreVerticalOffset", numberValue);
            apply("scoresize", "e05scoresize", "scoreSize", numberValue);
            apply("scoreopacity", "e06scoreopacity", "scoreOpacity", numberValue);
            apply("scorecolor", "e07scorecolor", "scoreColor", (property, fallback) => String(value(property, fallback)));
            apply("scorebackground", "e08scorebackground", "scoreBackground", booleanValue);
            apply("scorebackgroundopacity", "e09scorebackgroundopacity", "scoreBackgroundOpacity", numberValue);
            const resetProperty = properties.resetstats !== undefined ? properties.resetstats : properties.e10resetstats;
            if (resetProperty !== undefined) {
                const shouldReset = booleanValue(resetProperty, defaults.resetStats);
                if (shouldReset && !settings.resetStats && window.pixelFleetApp) window.pixelFleetApp.clearStats();
                settings.resetStats = shouldReset;
            }
            const booleanProperties = {
                spawnearthcruiser: ["f01spawnearthcruiser", "spawnEarthCruiser"],
                spawnearthmissilefrigate: ["f02spawnearthmissilefrigate", "spawnEarthMissileFrigate"],
                spawnearthfighter: ["f03spawnearthfighter", "spawnEarthFighter"],
                spawnearthbomber: ["f04spawnearthbomber", "spawnEarthBomber"],
                spawngliesecorvette: ["g01spawngliesecorvette", "spawnGlieseCorvette"],
                spawngliesedreadnaught: ["g02spawngliesedreadnaught", "spawnGlieseDreadnaught"],
                spawngliesefighter: ["g03spawngliesefighter", "spawnGlieseFighter"],
                spawngliesebomber: ["g04spawngliesebomber", "spawnGlieseBomber"],
                spawneridanigunboat: ["h01spawneridanigunboat", "spawnEridaniGunboat"],
                spawneridanidestroyer: ["h02spawneridanidestroyer", "spawnEridaniDestroyer"],
                spawneridanifighter: ["h03spawneridanifighter", "spawnEridaniFighter"],
                spawneridanibomber: ["h04spawneridanibomber", "spawnEridaniBomber"],
                showhitboxes: ["i01showhitboxes", "showHitboxes"],
                showhpbars: ["i02showhpbars", "showHpBars"],
                showshipmovement: ["i03showshipmovement", "showShipMovement"],
                showshipstate: ["i04showshipstate", "showShipState"],
                showprojectiletargets: ["i05showprojectiletargets", "showProjectileTargets"],
                showfps: ["i06showfps", "showFps"]
            };
            for (const [propertyName, [legacyName, settingName]] of Object.entries(booleanProperties)) {
                const property = properties[propertyName] !== undefined ? properties[propertyName] : properties[legacyName];
                if (property !== undefined) {
                    settings[settingName] = booleanValue(property, defaults[settingName]);
                }
            }
            if (window.pixelFleetApp) window.pixelFleetApp.applySettings(settings);
        },
        setPaused(paused) {
            if (window.pixelFleetApp) window.pixelFleetApp.setPaused(paused);
        }
    };
}());