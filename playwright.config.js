const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    timeout: 30000,
    workers: 1,
    fullyParallel: false,
    use: {
        baseURL: "http://127.0.0.1:4174",
        headless: true
    },
    webServer: {
        command: "node tests/server.js",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: true
    }
});