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
            apply("a01renderquality", "renderquality", "renderQuality", (property, fallback) => String(value(property, fallback)));
            apply("a02zoom", "zoom", "zoom", numberValue);
            apply("a03brightness", "brightness", "brightness", numberValue);
            apply("b01simulationmode", "simulationmode", "simulationMode", (property, fallback) => String(value(property, fallback)));
            apply("b02capitalships", "capitalships", "capitalShips", numberValue);
            apply("b03fighters", "fighters", "fighters", numberValue);
            apply("b04bombers", "bombers", "bombers", numberValue);
            apply("c01asteroids", "asteroids", "asteroids", numberValue);
            apply("c02stars", "stars", "stars", (property, fallback) => String(value(property, fallback)));
            apply("c03spacedust", "spacedust", "spaceDust", (property, fallback) => String(value(property, fallback)));
            apply("c04planets", "planets", "planets", (property, fallback) => String(value(property, fallback)));
            apply("c05asteroidbelt", "asteroidbelt", "asteroidBelt", (property, fallback) => String(value(property, fallback)));
            apply("d01debris", "debris", "debris", booleanValue);
            apply("d02slowmotion", "slowmotion", "slowMotion", booleanValue);
            apply("d03autobalance", "autobalance", "autoBalance", booleanValue);
            apply("d04interaction", "interaction", "interaction", booleanValue);
            apply("e01showscore", "showscore", "showScore", booleanValue);
            apply("e02scoreorientation", "scoreorientation", "scoreOrientation", (property, fallback) => String(value(property, fallback)));
            apply("e03scorehorizontaloffset", "scorehorizontaloffset", "scoreHorizontalOffset", numberValue);
            apply("e04scoreverticaloffset", "scoreverticaloffset", "scoreVerticalOffset", numberValue);
            apply("e05scoresize", "scoresize", "scoreSize", numberValue);
            apply("e06scoreopacity", "scoreopacity", "scoreOpacity", numberValue);
            apply("e07scorecolor", "scorecolor", "scoreColor", (property, fallback) => String(value(property, fallback)));
            apply("e08scorebackground", "scorebackground", "scoreBackground", booleanValue);
            apply("e09scorebackgroundopacity", "scorebackgroundopacity", "scoreBackgroundOpacity", numberValue);
            const resetProperty = properties.e10resetstats !== undefined ? properties.e10resetstats : properties.resetstats;
            if (resetProperty !== undefined) {
                const shouldReset = booleanValue(resetProperty, defaults.resetStats);
                if (shouldReset && !settings.resetStats && window.pixelFleetApp) window.pixelFleetApp.clearStats();
                settings.resetStats = shouldReset;
            }
            const booleanProperties = {
                f01spawnearthcruiser: ["spawnearthcruiser", "spawnEarthCruiser"],
                f02spawnearthmissilefrigate: ["spawnearthmissilefrigate", "spawnEarthMissileFrigate"],
                f03spawnearthfighter: ["spawnearthfighter", "spawnEarthFighter"],
                f04spawnearthbomber: ["spawnearthbomber", "spawnEarthBomber"],
                g01spawngliesecorvette: ["spawngliesecorvette", "spawnGlieseCorvette"],
                g02spawngliesedreadnaught: ["spawngliesedreadnaught", "spawnGlieseDreadnaught"],
                g03spawngliesefighter: ["spawngliesefighter", "spawnGlieseFighter"],
                g04spawngliesebomber: ["spawngliesebomber", "spawnGlieseBomber"],
                h01spawneridanigunboat: ["spawneridanigunboat", "spawnEridaniGunboat"],
                h02spawneridanidestroyer: ["spawneridanidestroyer", "spawnEridaniDestroyer"],
                h03spawneridanifighter: ["spawneridanifighter", "spawnEridaniFighter"],
                h04spawneridanibomber: ["spawneridanibomber", "spawnEridaniBomber"],
                i01showhitboxes: ["showhitboxes", "showHitboxes"],
                i02showhpbars: ["showhpbars", "showHpBars"],
                i03showshipmovement: ["showshipmovement", "showShipMovement"],
                i04showshipstate: ["showshipstate", "showShipState"],
                i05showprojectiletargets: ["showprojectiletargets", "showProjectileTargets"],
                i06showfps: ["showfps", "showFps"]
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