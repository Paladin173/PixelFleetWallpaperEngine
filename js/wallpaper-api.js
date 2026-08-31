(function () {
    "use strict";

    const defaults = {
        renderQuality: "auto",
        simulationMode: "survival",
        capitalShips: 6,
        fighters: 12,
        bombers: 6,
        asteroids: 30,
        backgroundDetail: "random",
        debris: true,
        slowMotion: true,
        interaction: true,
        brightness: 100
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
            if (properties.backgrounddetail !== undefined) settings.backgroundDetail = String(value(properties.backgrounddetail, defaults.backgroundDetail));
            if (properties.debris !== undefined) settings.debris = booleanValue(properties.debris, defaults.debris);
            if (properties.slowmotion !== undefined) settings.slowMotion = booleanValue(properties.slowmotion, defaults.slowMotion);
            if (properties.interaction !== undefined) settings.interaction = booleanValue(properties.interaction, defaults.interaction);
            if (properties.brightness !== undefined) settings.brightness = numberValue(properties.brightness, defaults.brightness);
            if (window.pixelFleetApp) window.pixelFleetApp.applySettings(settings);
        },
        setPaused(paused) {
            if (window.pixelFleetApp) window.pixelFleetApp.setPaused(paused);
        }
    };
}());